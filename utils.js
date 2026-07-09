/**
 * General security sanitization, escaping, and UI layout utility functions.
 */
"use strict";

/**
 * Escapes characters in a string to prevent HTML/XSS injection.
 * @param {string} str The raw string to escape.
 * @returns {string} The HTML-safe escaped string.
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Parses and sanitizes an HTML response string to only allow safe tags.
 * Returns a DocumentFragment that can be safely appended to the DOM.
 * @param {string} html The raw HTML string.
 * @returns {DocumentFragment} The clean, safe DocumentFragment.
 */
export function sanitizeHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const doc = template.content;
  
  const allowedTags = new Set(['H4', 'P', 'UL', 'LI', 'STRONG', 'SPAN', 'BR', 'I']);
  const allowedAttrs = {
    'I': new Set(['data-lucide', 'class']),
    'SPAN': new Set(['class']),
    'LI': new Set(['class']),
  };

  function cleanNode(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName;
        if (!allowedTags.has(tagName)) {
          const textNode = document.createTextNode(child.textContent);
          node.replaceChild(textNode, child);
        } else {
          const attrs = Array.from(child.attributes);
          const safeAttrs = allowedAttrs[tagName] || new Set();
          for (const attr of attrs) {
            if (!safeAttrs.has(attr.name)) {
              child.removeAttribute(attr.name);
            }
          }
          cleanNode(child);
        }
      } else if (child.nodeType !== Node.TEXT_NODE) {
        node.removeChild(child);
      }
    }
  }

  cleanNode(doc);
  return doc;
}

/**
 * Escapes user text inputs and formats markdown bolding (**text**) to safe bold HTML tags.
 * @param {string} text The raw user input message.
 * @returns {string} The safe formatted HTML string.
 */
export function formatChatText(text) {
  const escaped = escapeHTML(text);
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/**
 * Safely sets the health telemetries status text inside a given element with a pulse dot.
 * @param {HTMLElement} element The target status element.
 * @param {string} text The descriptive status text.
 */
export function setHealthStatus(element, text) {
  if (!element) return;
  element.innerHTML = '';
  const dot = document.createElement('span');
  dot.className = 'pulse-dot';
  element.appendChild(dot);
  element.appendChild(document.createTextNode(' ' + text));
}
