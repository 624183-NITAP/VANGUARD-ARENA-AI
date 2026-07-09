/**
 * Client API utility to request the backend Gemini proxy server.
 */
"use strict";

/**
 * Sends system and user prompts to the secure backend proxy endpoint for Gemini processing.
 * @param {string} systemPrompt The system prompt instructions.
 * @param {string} userPrompt The user prompt context.
 * @returns {Promise<string>} The generated content text string.
 */
export async function queryGemini(systemPrompt, userPrompt) {
  if (typeof systemPrompt !== 'string' || typeof userPrompt !== 'string') {
    throw new Error("Invalid prompt inputs");
  }
  if (systemPrompt.length > 50000 || userPrompt.length > 10000) {
    throw new Error("Input payload too large");
  }

  const response = await fetch('/api/gemini', {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ systemPrompt, userPrompt })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Server returned ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!replyText) {
    throw new Error("Empty content in Gemini response");
  }
  return replyText;
}
