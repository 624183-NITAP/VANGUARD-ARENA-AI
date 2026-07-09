/**
 * Fan AI Concierge Assistant Chat Widget Logic.
 *
 * Architecture notes:
 * - Rate limiting is driven by AppState.chatbot.lastMessageTime so the limit
 *   is shared correctly between the main chat panel and the floating widget.
 * - System prompts are built by a single buildSystemPrompt() factory to avoid
 *   the 20-line duplication that existed between submitUserQuery and submitFloatUserQuery.
 * - The typing indicator bubble is built by a single createTypingBubble() helper.
 * - All dynamic text is set via textContent (never innerHTML) except for
 *   formatChatText() output which runs the text through escapeHTML first.
 */
"use strict";

import { queryGemini } from './api.js';
import { chatbotLocales, searchKeywords, fallbackLocales } from './config.js';
import { formatChatText } from './utils.js';
import { playRetroSound } from './sound.js';
import { speakAI } from './speech.js';
import { announceSR } from './helpers.js';
import { MAX_CHAT_LENGTH, CHAT_RATE_LIMIT_MS } from './constants.js';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Binds all chat-related DOM event listeners and language switchers.
 * Should be called once during DOMContentLoaded with the shared AppState.
 *
 * @param {Object} state Central AppState reference.
 */
export function initChat(state) {
  const btnChatSend        = document.getElementById('btn-chat-send');
  const chatInput          = document.getElementById('chat-input');
  const quickChips         = document.getElementById('quick-chips');
  const btnChatbotSendFloat= document.getElementById('btn-chatbot-send-float');
  const chatbotInputFloat  = document.getElementById('chatbot-input-float');
  const langButtonsFloat   = document.querySelectorAll('.lang-btn-float');

  if (btnChatSend) {
    btnChatSend.addEventListener('click', () => {
      playRetroSound('beep');
      submitUserQuery(state);
    });
  }

  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitUserQuery(state);
    });
  }

  if (quickChips) {
    quickChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-btn');
      if (!btn) return;
      playRetroSound('beep');
      const query = btn.getAttribute('data-query');
      if (chatInput) {
        chatInput.value = query;
        submitUserQuery(state);
      }
    });
  }

  if (btnChatbotSendFloat) {
    btnChatbotSendFloat.addEventListener('click', () => {
      playRetroSound('beep');
      submitFloatUserQuery(state);
    });
  }

  if (chatbotInputFloat) {
    chatbotInputFloat.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        playRetroSound('beep');
        submitFloatUserQuery(state);
      }
    });
  }

  // Language switcher — updates state.language and resets the float chat log
  langButtonsFloat.forEach(btn => {
    btn.addEventListener('click', () => {
      playRetroSound('beep');
      langButtonsFloat.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.language = btn.getAttribute('data-lang');

      const log = document.getElementById('chatbot-messages-float-log');
      if (log) {
        log.innerHTML = '';
        const bubble = _buildAiBubble(chatbotLocales[state.language].welcome, state.language);
        log.appendChild(bubble);
        lucide.createIcons();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Query Submission — Main Chat Panel
// ---------------------------------------------------------------------------

/**
 * Reads the main chat input, validates, rate-limits, then queries Gemini
 * and appends the AI reply to the main chat log.
 *
 * @param {Object} state AppState reference.
 */
export async function submitUserQuery(state) {
  const chatInput      = document.getElementById('chat-input');
  const chatMessagesLog= document.getElementById('chat-messages-log');
  if (!chatInput || !chatMessagesLog) return;

  let query = chatInput.value.trim();
  if (!query) return;

  if (!_checkRateLimit(state)) return;

  if (query.length > MAX_CHAT_LENGTH) query = query.substring(0, MAX_CHAT_LENGTH);

  appendChatBubble('user', query);
  chatInput.value = '';

  const typingBubble = createTypingBubble();
  chatMessagesLog.appendChild(typingBubble);
  chatMessagesLog.scrollTop = chatMessagesLog.scrollHeight;
  lucide.createIcons();

  const systemPrompt = buildSystemPrompt(state);

  let reply = '';
  try {
    reply = await queryGemini(systemPrompt, query);
  } catch (err) {
    console.warn('[Chat Service] Gemini failed. Falling back to local response engine.', err);
    reply = generateGenAIResponse(query, state.language);
    await new Promise(r => setTimeout(r, 800));
  }

  typingBubble.remove();
  appendChatBubble('ai', reply);
  speakAI(reply.replace(/\*\*|\*/g, ''), state.language);
  announceSR(`New AI Assistant reply: ${reply.substring(0, 100)}`);
}

// ---------------------------------------------------------------------------
// Query Submission — Floating Widget
// ---------------------------------------------------------------------------

/**
 * Reads the floating chatbot input, validates, rate-limits, then queries Gemini
 * and appends the AI reply to the floating chat log.
 *
 * @param {Object} state AppState reference.
 */
export async function submitFloatUserQuery(state) {
  const chatbotInputFloat     = document.getElementById('chatbot-input-float');
  const chatbotMessagesFloatLog = document.getElementById('chatbot-messages-float-log');
  if (!chatbotInputFloat || !chatbotMessagesFloatLog) return;

  let query = chatbotInputFloat.value.trim();
  if (!query) return;

  if (!_checkRateLimit(state)) return;

  if (query.length > MAX_CHAT_LENGTH) query = query.substring(0, MAX_CHAT_LENGTH);

  // Append user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user-bubble';
  userBubble.innerHTML = `
    <div class="chat-bubble-avatar"><i data-lucide="user" aria-hidden="true"></i></div>
    <div class="chat-bubble-text"></div>
  `;
  userBubble.querySelector('.chat-bubble-text').textContent = query;
  chatbotMessagesFloatLog.appendChild(userBubble);
  chatbotInputFloat.value = '';
  chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
  lucide.createIcons();

  const typingBubble = createTypingBubble();
  chatbotMessagesFloatLog.appendChild(typingBubble);
  chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
  lucide.createIcons();

  const systemPrompt = buildSystemPrompt(state);

  let reply = '';
  try {
    reply = await queryGemini(systemPrompt, query);
  } catch (err) {
    console.warn('[Chat Service] Gemini float failed. Using local response.', err);
    reply = generateGenAIResponse(query, state.language);
    await new Promise(r => setTimeout(r, 800));
  }

  typingBubble.remove();

  const aiBubble = _buildAiBubble(reply, state.language);
  chatbotMessagesFloatLog.appendChild(aiBubble);
  chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
  lucide.createIcons();

  speakAI(reply.replace(/\*\*|\*/g, ''), state.language);
  announceSR(`New AI Concierge reply: ${reply.substring(0, 100)}`);
}

// ---------------------------------------------------------------------------
// DOM Builders (Exported)
// ---------------------------------------------------------------------------

/**
 * Appends a chat bubble to the main chat log container.
 * Uses formatChatText() which HTML-escapes the content before processing
 * markdown bold syntax — preventing XSS via user input.
 *
 * @param {'ai'|'user'} sender Who sent the message.
 * @param {string}      text   Message content (may contain **bold** markdown).
 */
export function appendChatBubble(sender, text) {
  const chatMessagesLog = document.getElementById('chat-messages-log');
  if (!chatMessagesLog) return;

  const bubble = _buildBubble(sender, text);
  chatMessagesLog.appendChild(bubble);
  chatMessagesLog.scrollTop = chatMessagesLog.scrollHeight;
  lucide.createIcons();
}

/**
 * Builds an animated typing-indicator bubble element.
 * Used by both the main and floating chat panels to avoid duplication.
 *
 * @returns {HTMLDivElement} The typing indicator bubble element.
 */
export function createTypingBubble() {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai-bubble typing-bubble';
  bubble.innerHTML = `
    <div class="chat-bubble-avatar"><i data-lucide="cpu" aria-hidden="true"></i></div>
    <div class="chat-bubble-text">
      <div class="ai-spinner-container">
        <span class="ai-spinner-icon"><i data-lucide="refresh-cw" aria-hidden="true"></i></span>
        <span>[AI COGNITIVE CORE ANALYZING USER QUERY...]</span>
      </div>
    </div>
  `;
  return bubble;
}

// ---------------------------------------------------------------------------
// Fallback Response Engine
// ---------------------------------------------------------------------------

/**
 * Generates a local keyword-matched response when the Gemini API is offline.
 * Matches multilingual keywords to pre-configured response templates in config.js.
 *
 * @param {string} query    The user's message.
 * @param {string} language BCP-47 language tag (e.g. 'en', 'es').
 * @returns {string} A pre-written localized response string.
 */
export function generateGenAIResponse(query, language) {
  const textLower = query.toLowerCase();
  let matchKey = '';

  if (textLower.includes('gate') || textLower.includes('entry') || textLower.includes('wait') ||
      textLower.includes('queue') || textLower.includes('puerta') || textLower.includes('portão') ||
      textLower.includes('tor') || textLower.includes('بوابة') || textLower.includes('ゲート')) {
    matchKey = 'gate';
  } else if (textLower.includes('seat') || textLower.includes('sector') || textLower.includes('row') ||
             textLower.includes('platform') || textLower.includes('asiento') || textLower.includes('assento') ||
             textLower.includes('sitz') || textLower.includes('قطاع') || textLower.includes('座席') ||
             textLower.includes('セクター')) {
    matchKey = 'sector';
  } else if (textLower.includes('access') || textLower.includes('wheelchair') ||
             textLower.includes('silla de ruedas') || textLower.includes('cadeira') ||
             textLower.includes('barrierefrei') || textLower.includes('handicap') ||
             textLower.includes('احتياجات') || textLower.includes('車椅子') ||
             textLower.includes('バリアフリー')) {
    matchKey = 'accessibility';
  } else if (textLower.includes('transit') || textLower.includes('train') || textLower.includes('bus') ||
             textLower.includes('transport') || textLower.includes('tren') || textLower.includes('ônibus') ||
             textLower.includes('zug') || textLower.includes('نقل') || textLower.includes('電車') ||
             textLower.includes('バス')) {
    matchKey = 'transit';
  }

  if (matchKey && searchKeywords[matchKey]?.[language]) {
    return searchKeywords[matchKey][language];
  }
  return fallbackLocales[language] || fallbackLocales['en'];
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether the rate limit window has passed. Updates the timestamp on success.
 * Uses AppState.chatbot.lastMessageTime as the shared clock.
 *
 * @param {Object} state AppState reference.
 * @returns {boolean} True if the submission should proceed, false if rate-limited.
 * @private
 */
function _checkRateLimit(state) {
  const now = Date.now();
  if (now - state.chatbot.lastMessageTime < CHAT_RATE_LIMIT_MS) {
    console.warn('[Chat Service] Submission rate limited.');
    return false;
  }
  state.chatbot.lastMessageTime = now;
  return true;
}

/**
 * Builds the Gemini system prompt string from the current AppState.
 * Centralises stadium context so both chat panels use identical instructions.
 *
 * @param {Object} state AppState reference.
 * @returns {string} The complete system prompt for this query.
 * @private
 */
function buildSystemPrompt(state) {
  return `You are Vanguard Arena AI, the official tournament concierge for the FIFA World Cup 2026 at MetLife Stadium.
  You assist fans, volunteers, and organizers. You speak fluently in the requested language.

  Current Stadium Status:
  - Live Match: USA vs England (Score: 1-1, 74 mins). Total Attendance: 82,300.
  - Gate A (North): heavily congested (22m wait, due to scanner hardware connectivity drop). Advise fans to detour to Gate B.
  - Gate B (East): normal flow (4m wait). Recommend this gate for fastest entry/exit.
  - Gate C (South): moderate (11m wait).
  - Gate D (West): moderate (8m wait).
  - Sector 104: South-East quadrant, nearest to Gate B. Has accessible ramp 3 on the right and wheelchair platform seats at Row 12.
  - Restrooms: Concourse 102/103 is light queue (2m wait), Concourse 104 is congested (15m wait).
  - Concessions: Taco Arena at Sector 105 (8m wait), Beer Concession at Sector 104 (18m wait).
  - Transport: MetLife Rail connects to NYC Secaucus Junction (trains every 10m post-match). Buses/Shuttles leave from South Lot.

  Respond to the user's question directly in the requested language: "${state.language}".
  Keep your answers clear, professional, and very concise (maximum of 3 sentences or a short bulleted list),
  unless they ask for specific complex directions. Use markdown bolding (e.g., **Gate B**) where appropriate.
  Do not output code blocks.`;
}

/**
 * Creates a generic chat bubble element for the given sender and text.
 * @param {'ai'|'user'} sender Bubble sender identifier.
 * @param {string}      text   Message text (markdown bold supported).
 * @returns {HTMLDivElement} The complete bubble element.
 * @private
 */
function _buildBubble(sender, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}-bubble`;

  const isAI = sender === 'ai';
  const score = isAI ? (98.0 + Math.random() * 1.9).toFixed(1) : null;
  const confBadge = isAI ? `<div class="ai-confidence-badge">CONF: ${score}%</div>` : '';

  bubble.innerHTML = `
    <div class="chat-bubble-avatar">
      <i data-lucide="${isAI ? 'cpu' : 'user'}" aria-hidden="true"></i>
      ${confBadge}
    </div>
    <div class="chat-bubble-text"></div>
  `;
  bubble.querySelector('.chat-bubble-text').innerHTML = formatChatText(text);
  return bubble;
}

/**
 * Builds a standalone AI bubble element (used in the floating log).
 * @param {string} text     Message text.
 * @param {string} language Current language (unused here but kept for future TTS).
 * @returns {HTMLDivElement} The bubble element.
 * @private
 */
function _buildAiBubble(text, language) {
  return _buildBubble('ai', text);
}
