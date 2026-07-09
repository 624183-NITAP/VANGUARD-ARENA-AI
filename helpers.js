/**
 * Shared helper utilities for notifications, screen readers, map highlights,
 * and performance primitives (debounce, throttle).
 *
 * All functions are pure DOM utilities with no business logic — they can be
 * tested independently of any feature module.
 */
"use strict";

// ---------------------------------------------------------------------------
// Toast Notifications
// ---------------------------------------------------------------------------

/**
 * Renders a glowing notification banner in the top-right overlay container.
 * Uses textContent (never innerHTML) for title and body to prevent XSS.
 *
 * @param {string} title Toast header text.
 * @param {string} text  Toast body message.
 * @param {string} type  Visual classification: 'alert' | 'warning' | 'system' | 'info'.
 */
export function showToast(title, text, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    alert: 'alert-triangle',
    warning: 'alert-circle',
    system: 'shield-check'
  };
  const iconName = iconMap[type] || 'info';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  // Build structure safely without innerHTML for dynamic data
  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${iconName}" aria-hidden="true"></i></div>
    <div class="toast-body">
      <strong class="toast-title"></strong>
      <div class="toast-text"></div>
    </div>
  `;
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-text').textContent = text;

  container.appendChild(toast);
  lucide.createIcons();

  // Auto-dismiss after 4.5s with a fade-out animation
  setTimeout(() => {
    toast.style.animation = 'toast-fade-out 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ---------------------------------------------------------------------------
// Screen Reader Announcer
// ---------------------------------------------------------------------------

/**
 * Updates the polite ARIA live region so screen readers announce the message.
 * Clears text first to force a DOM mutation even if the new string is identical.
 *
 * @param {string} text The announcement text for screen readers.
 */
export function announceSR(text) {
  const announcer = document.getElementById('accessibility-announcer');
  if (!announcer) return;
  announcer.textContent = '';
  // Brief delay ensures screen readers detect the mutation as a new event
  setTimeout(() => {
    announcer.textContent = text;
  }, 50);
}

// ---------------------------------------------------------------------------
// Stadium Map Highlight Helpers
// ---------------------------------------------------------------------------

/**
 * Highlights a single stadium sector or gate element by CSS class.
 * Optionally applies a brief scale zoom animation to draw attention.
 *
 * @param {string}  id   The element's `id` attribute or `data-id` value.
 * @param {boolean} [zoom=false] If true, scales the element to 1.03× for 2s.
 */
export function highlightStadiumElement(id, zoom = false) {
  clearHighlightedStadiumElements();
  const el = document.getElementById(id) || document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.add('highlighted-active');
  if (zoom) {
    el.style.transform = 'scale(1.03)';
    setTimeout(() => { el.style.transform = ''; }, 2000);
  }
}

/**
 * Removes the `highlighted-active` CSS class from all sector and gate elements.
 */
export function clearHighlightedStadiumElements() {
  document.querySelectorAll('.stadium-sector, .map-gate').forEach(el => {
    el.classList.remove('highlighted-active');
  });
}

// ---------------------------------------------------------------------------
// Performance Primitives
// ---------------------------------------------------------------------------

/**
 * Returns a debounced version of `fn` that only fires after `ms` milliseconds
 * of silence since the last call. Useful for search inputs and resize handlers.
 *
 * @template {(...args: unknown[]) => unknown} T
 * @param {T} fn The function to debounce.
 * @param {number} ms Silence window in milliseconds.
 * @returns {T} The debounced wrapper function.
 */
export function debounce(fn, ms) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Returns a throttled version of `fn` that fires at most once per `ms`
 * milliseconds regardless of call frequency. Ideal for mousemove handlers.
 *
 * @template {(...args: unknown[]) => unknown} T
 * @param {T} fn The function to throttle.
 * @param {number} ms Minimum interval between invocations in milliseconds.
 * @returns {T} The throttled wrapper function.
 */
export function throttle(fn, ms) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

// ---------------------------------------------------------------------------
// Date / Time Formatting
// ---------------------------------------------------------------------------

/**
 * Formats a Date object as a zero-padded HH:MM:SS string.
 *
 * @param {Date} [date=new Date()] The date to format. Defaults to now.
 * @returns {string} Time string in "HH:MM:SS" format.
 */
export function formatTime(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
