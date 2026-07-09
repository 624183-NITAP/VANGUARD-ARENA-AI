/**
 * Accessibility, Focus Trapping, Contrast Modes, and Keyboard Shortcuts Manager.
 *
 * Architecture notes:
 * - clearRoutePath is injected as a dependency (not read from window.VanguardOps)
 *   so this module has no runtime coupling to the global namespace.
 * - prefers-reduced-motion is observed via matchMedia to suppress animations.
 * - Keyboard shortcuts use Alt+key combos to avoid conflicting with browser defaults.
 * - Focus trapping is implemented for the floating chatbot dialog per WCAG 2.5.3.
 */
"use strict";

import { playRetroSound } from './sound.js';
import { speakAI } from './speech.js';
import { announceSR } from './helpers.js';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initializes all accessibility features:
 *   - High-contrast mode toggle button
 *   - Global keyboard shortcuts (Alt+A, Alt+1, Alt+2, Alt+C)
 *   - Focus trapping for the chatbot modal window
 *   - prefers-reduced-motion observer
 *
 * @param {Object}   state               Central AppState reference.
 * @param {Object}   deps                Injected dependencies.
 * @param {Function} deps.clearRoutePath Function to hide SVG route overlays.
 */
export function initAccessibility(state, deps = {}) {
  const { clearRoutePath } = deps;
  const btnAccessibilityMode = document.getElementById('btn-accessibility-mode');
  const chatbotWindow = document.getElementById('chatbot-window');

  // High-contrast mode toggle
  if (btnAccessibilityMode) {
    btnAccessibilityMode.addEventListener('click', () => {
      toggleAccessibilityMode(state, clearRoutePath);
    });
  }

  // Global keyboard shortcut handler
  document.addEventListener('keydown', (e) => {
    _handleKeyboardShortcut(e, state, clearRoutePath);
  });

  // Focus trapping inside the floating chatbot dialog
  if (chatbotWindow) {
    chatbotWindow.addEventListener('keydown', (e) => {
      _trapFocus(e, chatbotWindow);
    });
  }

  // Observe prefers-reduced-motion changes at runtime (e.g. OS setting change)
  if (window.matchMedia) {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      if (e.matches) {
        document.body.classList.add('reduced-motion');
        announceSR('Reduced motion preference detected. Animations disabled.');
      } else {
        document.body.classList.remove('reduced-motion');
      }
    });
    // Apply initial state
    if (motionQuery.matches) {
      document.body.classList.add('reduced-motion');
    }
  }
}

// ---------------------------------------------------------------------------
// Accessibility Mode Toggle
// ---------------------------------------------------------------------------

/**
 * Toggles high-contrast accessibility mode on the body element.
 * Updates AppState.isAccessibilityMode and refreshes the toggle button label.
 * Clears any active SVG route overlays to reduce visual clutter.
 *
 * @param {Object}    state           Central AppState reference.
 * @param {Function}  [clearRoute]    Optional function to hide route SVG overlays.
 */
export function toggleAccessibilityMode(state, clearRoute) {
  const btnAccessibilityMode = document.getElementById('btn-accessibility-mode');
  if (!btnAccessibilityMode) return;

  playRetroSound('beep');
  document.body.classList.toggle('accessibility-mode');
  state.isAccessibilityMode = document.body.classList.contains('accessibility-mode');

  if (state.isAccessibilityMode) {
    btnAccessibilityMode.setAttribute('aria-pressed', 'true');
    _setButtonContent(btnAccessibilityMode, 'eye', ' Normal Contrast');

    // Clear route overlays — no longer depends on window.VanguardOps
    if (typeof clearRoute === 'function') clearRoute();

    speakAI(
      'Accessibility mode enabled. Large text and high contrast borders loaded. CRT overlay effects and sound alarms deactivated.',
      'en'
    );
    announceSR('Accessibility high contrast mode activated. Layout animations and CRT screen effects have been disabled.');
  } else {
    btnAccessibilityMode.setAttribute('aria-pressed', 'false');
    _setButtonContent(btnAccessibilityMode, 'accessibility', ' Accessibility Mode');

    speakAI('Returned to standard interface layout.', 'en');
    announceSR('Accessibility high contrast mode deactivated.');
  }

  lucide.createIcons();
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

/**
 * Handles global Alt+key keyboard shortcuts.
 *
 * Shortcut map:
 *   Alt + A  — Toggle accessibility mode
 *   Alt + 1  — Switch to Operations Control view
 *   Alt + 2  — Switch to Fan Concierge Hub view
 *   Alt + C  — Toggle floating AI Concierge chatbot
 *
 * @param {KeyboardEvent} e              The keydown event.
 * @param {Object}        state          AppState reference.
 * @param {Function}      [clearRoute]   clearRoutePath dependency.
 * @private
 */
function _handleKeyboardShortcut(e, state, clearRoute) {
  if (!e.altKey) return;

  const key = e.key.toLowerCase();

  if (key === 'a') {
    e.preventDefault();
    toggleAccessibilityMode(state, clearRoute);
  } else if (e.key === '1') {
    e.preventDefault();
    document.getElementById('btn-staff-view')?.click();
  } else if (e.key === '2') {
    e.preventDefault();
    document.getElementById('btn-fan-view')?.click();
  } else if (key === 'c') {
    e.preventDefault();
    document.getElementById('btn-chatbot-toggle')?.click();
  }
}

/**
 * Traps keyboard focus inside a modal container element.
 * Wraps Tab and Shift+Tab to cycle between the first and last focusable elements.
 *
 * @param {KeyboardEvent} e         The keydown event.
 * @param {HTMLElement}   container The modal element to trap focus inside.
 * @private
 */
function _trapFocus(e, container) {
  if (e.key !== 'Tab') return;

  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex="0"]'
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      last.focus();
      e.preventDefault();
    }
  } else {
    if (document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
}

/**
 * Safely sets a button's content to a Lucide icon + text label.
 * Avoids innerHTML assignment on interactive elements per XSS best practice.
 *
 * @param {HTMLButtonElement} btn      Target button element.
 * @param {string}            iconName Lucide icon name (data-lucide attribute value).
 * @param {string}            label    Text label to append after the icon.
 * @private
 */
function _setButtonContent(btn, iconName, label) {
  btn.innerHTML = '';
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', iconName);
  icon.setAttribute('aria-hidden', 'true');
  btn.appendChild(icon);
  btn.appendChild(document.createTextNode(label));
}
