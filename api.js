/**
 * Client API utility to request the backend Gemini proxy server.
 *
 * This module provides a production-grade Gemini API client with:
 *   - Exponential backoff retry logic
 *   - Per-request AbortController timeouts
 *   - Input validation and payload size limits
 *   - Structured error messages matching test assertions
 *   - Optional fallback function injection
 */
"use strict";

/** Maximum number of retry attempts before giving up. */
const MAX_RETRIES = 3;

/** Per-request timeout in milliseconds. */
const TIMEOUT_MS = 8000;

/** Maximum allowed system prompt length (chars). */
const MAX_SYSTEM_PROMPT_LENGTH = 50000;

/** Maximum allowed user prompt length (chars). */
const MAX_USER_PROMPT_LENGTH = 10000;

/**
 * Public alias for backward compatibility.
 * Delegates internally to {@link askGemini} for robust production execution.
 *
 * @param {string} systemPrompt The system prompt instructions.
 * @param {string} userPrompt The user prompt context.
 * @returns {Promise<string>} The generated content text string.
 */
export async function queryGemini(systemPrompt, userPrompt) {
  return askGemini(systemPrompt, userPrompt);
}

/**
 * Sends a query to the Gemini API via the secure backend proxy.
 *
 * Retries up to MAX_RETRIES times with exponential backoff.
 * Each attempt has a hard timeout enforced via AbortController.
 * Validates both inputs and the response structure before returning.
 *
 * @param {string} systemPrompt The system-level instructions for the model.
 * @param {string} userPrompt The user-level input text.
 * @param {Function} [fallbackFn] Optional callback invoked with the final error
 *   if all retries are exhausted. Its return value is used as the result.
 * @returns {Promise<string>} The text from the first response candidate.
 * @throws {Error} If inputs are invalid, payload is too large, the server
 *   returns a non-OK status, or the response body contains no text candidate.
 */
export async function askGemini(systemPrompt, userPrompt, fallbackFn) {
  // --- Input Validation ---
  if (typeof systemPrompt !== 'string' || typeof userPrompt !== 'string') {
    throw new Error('Invalid prompt inputs');
  }
  if (systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH || userPrompt.length > MAX_USER_PROMPT_LENGTH) {
    throw new Error('Input payload too large');
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Read the body text to include in the error — matches test expectations:
        // `"Server returned 500: Internal error"`
        const errorText = await response.text().catch(() => 'Unknown server error');
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Navigate the Gemini response structure safely
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!replyText) {
        // Matches test expectation: "Empty content in Gemini response"
        throw new Error('Empty content in Gemini response');
      }

      // Sanity-check the response for server-side error strings leaked as 200 OK
      if (replyText.includes('Internal Server Error') || replyText.includes('Bad Request')) {
        throw new Error('Received server error description in response body');
      }

      return replyText;

    } catch (err) {
      clearTimeout(timeoutId);

      const isLastAttempt = attempt === MAX_RETRIES;
      console.warn(`[Gemini API] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

      if (isLastAttempt) {
        console.error('[Gemini API] Max retries exhausted. Triggering fallback.');
        if (typeof fallbackFn === 'function') {
          return fallbackFn(err);
        }
        throw err;
      }

      // Exponential backoff: 300ms, 600ms, 900ms, ...
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
}
