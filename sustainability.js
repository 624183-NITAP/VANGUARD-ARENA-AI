/**
 * Green Play Sustainability Tracker Logic.
 *
 * Handles eco-point accumulation, tier upgrades, and dynamic tip generation.
 * Uses showToast() instead of the blocking alert() call for accessible feedback.
 */
"use strict";

import { dynamicEcoTips, chatbotLocales } from './config.js';
import { ECO_PLATINUM_TIER_LIMIT } from './constants.js';
import { playRetroSound } from './sound.js';
import { speakAI } from './speech.js';
import { showToast, announceSR } from './helpers.js';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Binds eco-point calculation and eco-tip generation button listeners.
 * Must be called once during DOMContentLoaded with the shared AppState.
 *
 * @param {Object} state Central AppState reference.
 */
export function initSustainability(state) {
  const btnCalculateEco = document.getElementById('btn-calculate-eco');
  const btnNewEcoTip    = document.getElementById('btn-new-eco-tip');
  const selectTransitMode = document.getElementById('select-transit-mode');
  const ecoTipBox       = document.getElementById('eco-tip-box');

  if (btnCalculateEco) {
    btnCalculateEco.addEventListener('click', () => {
      if (!selectTransitMode) return;
      playRetroSound('beep');
      _logEcoTransit(state, selectTransitMode);
    });
  }

  if (btnNewEcoTip) {
    btnNewEcoTip.addEventListener('click', () => {
      playRetroSound('beep');
      _showNewEcoTip(state, ecoTipBox);
    });
  }
}

// ---------------------------------------------------------------------------
// Private Feature Functions
// ---------------------------------------------------------------------------

/**
 * Processes a transit log submission:
 *   1. Reads eco points from the selected transit option's data-points attribute.
 *   2. Adds points to AppState.ecoPoints.
 *   3. Updates all eco score display elements.
 *   4. Shows an accessible toast notification (replaces the blocking alert()).
 *   5. Checks for tier upgrade to Platinum Champion.
 *   6. Plays success sound and triggers TTS feedback.
 *
 * @param {Object}          state          AppState reference.
 * @param {HTMLSelectElement} selectElement The transit mode select element.
 * @private
 */
function _logEcoTransit(state, selectElement) {
  const option = selectElement.options[selectElement.selectedIndex];
  if (!option) return;

  const pointsToAdd = parseInt(option.getAttribute('data-points') || '0', 10);
  state.ecoPoints += pointsToAdd;

  // Update score badge in fan stats bar
  const greenScoreStat = document.getElementById('green-score-stat');
  if (greenScoreStat) {
    const valEl = greenScoreStat.querySelector('.fan-stat-val');
    if (valEl) valEl.textContent = `${state.ecoPoints} pts`;
  }

  // Update the eco circle value display
  const valCircle = document.querySelector('.eco-circle-value');
  if (valCircle) valCircle.textContent = state.ecoPoints;

  // Accessible toast instead of blocking alert()
  showToast(
    'Eco Points Logged!',
    `+${pointsToAdd} Green Points earned. Total: ${state.ecoPoints} pts.`,
    'system'
  );
  announceSR(`Logged transit successfully. Earned ${pointsToAdd} points, total balance is ${state.ecoPoints} points.`);

  // Tier upgrade check
  if (state.ecoPoints >= ECO_PLATINUM_TIER_LIMIT) {
    const tierEl = document.querySelector('.eco-stat-details h3');
    if (tierEl) tierEl.textContent = 'Carbon Saver Tier: Platinum Champion';
  }

  playRetroSound('success');
  speakAI(chatbotLocales[state.language]?.ecoSuccess || 'Points logged.', state.language);
}

/**
 * Picks a random eco tip from the dynamic tips pool and displays it
 * in the tip box element, then reads it aloud.
 *
 * @param {Object}      state   AppState reference.
 * @param {HTMLElement} tipBox  The element to display the tip text in.
 * @private
 */
function _showNewEcoTip(state, tipBox) {
  const tip = dynamicEcoTips[Math.floor(Math.random() * dynamicEcoTips.length)];
  if (tipBox) {
    tipBox.textContent = `"${tip}"`;
  }
  playRetroSound('success');
  speakAI(tip, state.language);
  announceSR(`New GenAI Eco Tip generated: ${tip}`);
}
