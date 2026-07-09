/**
 * Web Speech API wrappers for voice synthesis and recognition.
 */
"use strict";

/**
 * Native SpeechRecognition constructor from browser window.
 */
export const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * Narrates text via the SpeechSynthesis API in the requested language.
 * @param {string} text The plain text to speak out.
 * @param {string} lang The language key (e.g. 'en', 'es').
 */
export function speakAI(text, lang = 'en') {
  const speechSynth = window.speechSynthesis;
  if (!speechSynth) return;
  
  if (speechSynth.speaking) {
    speechSynth.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  
  const voiceLocales = {
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-BR',
    de: 'de-DE',
    fr: 'fr-FR',
    ar: 'ar-SA',
    ja: 'ja-JP',
    it: 'it-IT',
    zh: 'zh-CN',
    hi: 'hi-IN',
    ko: 'ko-KR'
  };
  utterance.lang = voiceLocales[lang] || 'en-US';
  speechSynth.speak(utterance);
}

/**
 * Instantiates and configures a browser SpeechRecognition instance.
 * @param {object} callbacks Callback handlers for recognition events.
 * @param {Function} callbacks.onStart Called when speech recording starts.
 * @param {Function} callbacks.onResult Called when speech transcription returns.
 * @param {Function} callbacks.onEnd Called when speech recording ends.
 * @param {Function} callbacks.onError Called when speech recording encounters errors.
 * @returns {object|null} The SpeechRecognition instance, or null if unsupported.
 */
export function createSpeechRecognition({ onStart, onResult, onEnd, onError }) {
  if (!SpeechRecognition) return null;
  
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  
  if (onStart) recognition.onstart = onStart;
  if (onResult) recognition.onresult = onResult;
  if (onEnd) recognition.onend = onEnd;
  if (onError) recognition.onerror = onError;
  
  return recognition;
}
