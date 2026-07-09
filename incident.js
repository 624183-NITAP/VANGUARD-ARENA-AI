/**
 * Operations Incident Dispatch Terminal Logic.
 */
"use strict";

import { askGemini } from './api.js';
import { customIncidentsList, incidentResolutions } from './config.js';
import { sanitizeHTML } from './utils.js';
import { playRetroSound } from './sound.js';
import { speakAI } from './speech.js';
import { showToast, highlightStadiumElement, clearHighlightedStadiumElements, announceSR } from './helpers.js';
import { appendLiveEvent } from './telemetry.js';

/**
 * Initializes listeners for incident dispatches.
 * @param {Object} state Central AppState.
 */
export function initIncidents(state) {
  const btnTriggerIncident = document.getElementById('btn-trigger-incident');
  const btnDispatchAction = document.getElementById('btn-dispatch-action');
  const incidentContainer = document.getElementById('incident-container');

  if (btnTriggerIncident) {
    btnTriggerIncident.addEventListener('click', () => {
      triggerCustomIncident(state);
    });
  }

  if (btnDispatchAction) {
    btnDispatchAction.addEventListener('click', () => {
      playRetroSound('beep');
      showToast("Incident Dispatched", "Operations command broadcasted to area volunteers.", "system");
      
      const activeRow = document.querySelector('.incident-row.active-row');
      if (activeRow) {
        activeRow.classList.add('resolved-row');
        activeRow.classList.remove('active-row');
        const solveBtn = activeRow.querySelector('.btn-incident-solve');
        if (solveBtn) {
          solveBtn.innerHTML = `Mitigated <i data-lucide="check-circle" class="icon-sm"></i>`;
          solveBtn.className = "btn-incident-solve solved";
          solveBtn.disabled = true;
        }
      }
      
      const consoleLog = document.getElementById('console-log');
      const consoleFooter = document.getElementById('console-footer');
      if (consoleLog) {
        consoleLog.innerHTML = `<div class="console-placeholder-msg"><i data-lucide="check-circle" class="icon-green" aria-hidden="true"></i> Mitigations executed. Incident closed.</div>`;
      }
      if (consoleFooter) {
        consoleFooter.style.display = 'none';
      }
      lucide.createIcons();
      clearHighlightedStadiumElements();
      announceSR("Operations mitigations dispatched successfully. Incident status closed.");
    });
  }

  // Delegate solve click events inside the incident container
  if (incidentContainer) {
    incidentContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-incident-solve');
      if (!btn || btn.classList.contains('solved')) return;

      playRetroSound('beep');
      const id = btn.getAttribute('data-incident-id');
      
      // Toggle active states on rows
      document.querySelectorAll('.incident-row').forEach(row => row.classList.remove('active-row'));
      const row = document.getElementById(`inc-${id}`);
      if (row) row.classList.add('active-row');

      state.activeIncidentId = id;
      solveIncident(state, id);
    });
  }
}

/**
 * Triggers a mitigation query to Gemini, rendering the steps inside the console log.
 * @param {Object} state Central AppState.
 * @param {string} id Incident target ID.
 */
export async function solveIncident(state, id) {
  const consoleLog = document.getElementById('console-log');
  const consoleStatusText = document.getElementById('console-status-text');
  const consoleFooter = document.getElementById('console-footer');
  if (!consoleLog || !consoleStatusText || !consoleFooter) return;

  consoleLog.innerHTML = '';
  const placeholder = document.createElement('div');
  placeholder.className = 'console-placeholder-msg';
  placeholder.innerHTML = `<span class="ticker-live-dot blinking"></span>`;
  placeholder.appendChild(document.createTextNode(' Generating operational response vector via Gemini 1.5 Flash...'));
  consoleLog.appendChild(placeholder);
  consoleFooter.style.display = 'none';

  const activeRow = document.querySelector(`.incident-row.active-row`);
  const title = activeRow ? activeRow.querySelector('.incident-title').textContent : "Stadium Incident";
  const desc = activeRow ? activeRow.querySelector('.incident-desc').textContent : "Unspecified anomaly";
  const locNode = activeRow ? activeRow.querySelector('.incident-loc') : null;
  const location = locNode ? locNode.textContent.trim() : "Stadium";

  const systemPrompt = `You are Vanguard Arena AI, an operational decision support system for MetLife Stadium.
  Generate a tactical mitigation action plan in raw HTML containing ONLY <h4> and <ul> list with <li> elements.
  Use <strong> tag for key metrics. Include immediate containment step, digital broadcast alert, staff reallocation, and recovery step.`;

  const userPrompt = `An incident occurred: "${title}" at "${location}". Details: "${desc}".`;

  announceSR(`Resolving incident ${title} at ${location} via Gemini AI...`);

  let responseHtml = "";
  try {
    responseHtml = await askGemini(systemPrompt, userPrompt);
    consoleStatusText.textContent = "Resolution generated (100% confidence)";
    consoleLog.innerHTML = '';
    consoleLog.appendChild(sanitizeHTML(responseHtml));
    consoleFooter.style.display = 'flex';
    playRetroSound('success');
  } catch (err) {
    console.warn("[Incident Service] Gemini mitigation query failed. Using local fallback.", err);
    const data = incidentResolutions[id];
    if (data) {
      consoleStatusText.textContent = "Resolution generated (Local Fallback)";
      consoleLog.innerHTML = '';
      consoleLog.appendChild(sanitizeHTML(data.resolution));
    } else {
      consoleStatusText.textContent = "Simulation completed";
      consoleLog.innerHTML = '';
      consoleLog.appendChild(sanitizeHTML(`<h4>Custom GenAI Response (Fallback)</h4><p>Containment procedures logged. Redirection notices pushed to active tickets.</p>`));
    }
    consoleFooter.style.display = 'flex';
    playRetroSound('success');
  }

  // Perform map alerts highlights
  if (id === '1') {
    highlightStadiumElement('Gate A', true);
  } else if (id === '2') {
    highlightStadiumElement('104', true);
  }
}

/**
 * Triggers a custom incident mock event, appending it to the dispatcher queue.
 * @param {Object} state Central AppState.
 */
export function triggerCustomIncident(state) {
  const incidentContainer = document.getElementById('incident-container');
  if (!incidentContainer) return;

  const items = customIncidentsList;
  const pick = items[Math.floor(Math.random() * items.length)];
  const id = state.customIncidentCounter.toString();
  state.customIncidentCounter++;

  // Save resolution mock template
  incidentResolutions[id] = {
    title: pick.title,
    status: "Calculated response",
    resolution: pick.sol
  };

  const row = document.createElement('div');
  row.className = `incident-row priority-${pick.prio}`;
  row.id = `inc-${id}`;
  row.innerHTML = `
    <div class="incident-status-bar"></div>
    <div class="incident-details">
      <div class="incident-meta">
        <span class="badge"></span>
        <span class="incident-time">Just Now</span>
        <span class="incident-loc"><i data-lucide="map-pin"></i> <span></span></span>
      </div>
      <h3 class="incident-title"></h3>
      <p class="incident-desc"></p>
    </div>
    <button class="btn-incident-solve">
      Run AI Mitigate <i data-lucide="zap"></i>
    </button>
  `;
  const badgeEl = row.querySelector('.badge');
  badgeEl.className = `badge ${pick.prio === 'high' ? 'badge-danger' : 'badge-warning'}`;
  badgeEl.textContent = pick.badge;
  row.querySelector('.incident-loc span').textContent = pick.loc;
  row.querySelector('.incident-title').textContent = pick.title;
  row.querySelector('.incident-desc').textContent = pick.desc;
  row.querySelector('.btn-incident-solve').setAttribute('data-incident-id', id);

  incidentContainer.insertBefore(row, incidentContainer.firstChild);
  lucide.createIcons();

  // Auto-solve: clear previous active states and activate the new incident
  document.querySelectorAll('.btn-incident-solve').forEach(btn => btn.classList.remove('active-solve'));
  document.querySelectorAll('.incident-row').forEach(r => r.classList.remove('active-row'));
  const newSolveBtn = row.querySelector('.btn-incident-solve');
  if (newSolveBtn) newSolveBtn.classList.add('active-solve');
  row.classList.add('active-row');

  state.activeIncidentId = id;
  solveIncident(state, id);

  playRetroSound('warn');
  showToast("Operational Warning", `New Incident: ${pick.title}`, "alert");
  announceSR(`Operations warning: New incident logged: ${pick.title}.`);
  appendLiveEvent(state, 'security', `Incident logged: ${pick.title} at ${pick.loc}.`);
}
