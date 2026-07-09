/**
 * VANGUARD ARENA AI — APPLICATION ORCHESTRATOR
 *
 * This is the top-level entry point. Its sole responsibility is to:
 *   1. Cache DOM references needed for cross-cutting UI (view switching, map
 *      overlays, tab navigation, routing, predictions).
 *   2. Initialize all specialized feature modules with the shared AppState.
 *   3. Bind the remaining UI event handlers that don't belong in a single module.
 *   4. Expose the window.VanguardOps namespace for integration tests.
 *
 * Feature-specific logic lives in dedicated modules:
 *   - telemetry.js   Health bar updates and live event feed
 *   - incident.js    Operations incident dispatch terminal
 *   - chat.js        Fan AI Concierge chat (main panel + floating widget)
 *   - sustainability.js  Green Play eco-point tracker
 *   - accessibility.js   Keyboard shortcuts, focus trapping, contrast mode
 *   - routing.js     Graph-based Dijkstra wayfinding engine
 *   - predictions.js Formula-based crowd forecast engine
 *   - map.js         SVG route overlay drawing
 *   - helpers.js     Toast, SR announcer, highlight, debounce, throttle
 */
"use strict";

import {
  sectorCoords,
  gateCoords,
  chatbotLocales,
  retroLiveEventsPool
} from './config.js';

import { sanitizeHTML } from './utils.js';
import { queryGemini } from './api.js';
import { playRetroSound } from './sound.js';
import { speakAI, createSpeechRecognition } from './speech.js';
import { drawRoutePath, clearRoutePath } from './map.js';

import {
  showToast,
  announceSR,
  highlightStadiumElement,
  clearHighlightedStadiumElements
} from './helpers.js';

import { telemetryManager, appendLiveEvent } from './telemetry.js';
import { initIncidents } from './incident.js';
import { initChat, appendChatBubble, generateGenAIResponse } from './chat.js';
import { initSustainability } from './sustainability.js';
import { initAccessibility } from './accessibility.js';
import { calculateCrowdForecast } from './predictions.js';
import { AppState } from './state.js';
import {
  ROUTE_PREFERENCES,
  LIVE_EVENT_INTERVAL_MS,
  LIVE_EVENT_LOAD_INTERVAL_MS
} from './constants.js';

// ---------------------------------------------------------------------------
// DOMContentLoaded Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icon library
  lucide.createIcons();

  // --- Initialize Feature Modules ---
  // Each module receives the shared AppState reference and sets up its own
  // DOM listeners. Modules do not communicate directly with each other.
  telemetryManager.init(AppState);
  initIncidents(AppState);
  initChat(AppState);
  initSustainability(AppState);
  initAccessibility(AppState, { clearRoutePath });

  // --- Cache DOM References ---
  // All elements cached here to avoid repeated getElementById calls.
  const btnStaffView         = document.getElementById('btn-staff-view');
  const btnFanView           = document.getElementById('btn-fan-view');
  const staffViewPanel       = document.getElementById('staff-view-panel');
  const fanViewPanel         = document.getElementById('fan-view-panel');

  const mapBtnHeatmap        = document.getElementById('map-btn-heatmap');
  const mapBtnAccessibility  = document.getElementById('map-btn-accessibility');
  const mapBtnFacilities     = document.getElementById('map-btn-facilities');
  const stadiumMap           = document.getElementById('stadium-map');

  const mapTooltip           = document.getElementById('map-tooltip');
  const tooltipCapacity      = document.getElementById('tooltip-capacity');
  const tooltipWait          = document.getElementById('tooltip-wait');

  const consoleLog           = document.getElementById('console-log');
  const btnSpeakMitigation   = document.getElementById('btn-speak-mitigation');

  const chatMessagesLog      = document.getElementById('chat-messages-log');
  const chatInput            = document.getElementById('chat-input');
  const btnChatMic           = document.getElementById('btn-chat-mic');

  const tabBtnAssistant      = document.getElementById('tab-btn-assistant');
  const tabBtnNavigation     = document.getElementById('tab-btn-navigation');
  const tabBtnSustainability = document.getElementById('tab-btn-sustainability');
  const tabBtnPredictions    = document.getElementById('tab-btn-predictions');

  const fanTabAssistant      = document.getElementById('fan-tab-assistant');
  const fanTabNavigation     = document.getElementById('fan-tab-navigation');
  const fanTabSustainability = document.getElementById('fan-tab-sustainability');
  const fanTabPredictions    = document.getElementById('fan-tab-predictions');

  const inputGate            = document.getElementById('input-gate');
  const inputSector          = document.getElementById('input-sector');
  const checkboxWheelchair   = document.getElementById('checkbox-wheelchair');
  const inputRoutePref       = document.getElementById('input-route-pref');
  const btnCalculateRoute    = document.getElementById('btn-calculate-route');
  const directionsOutputBox  = document.getElementById('directions-output-box');
  const directionsStepsList  = document.getElementById('directions-steps-list');

  const btnChatbotToggle     = document.getElementById('btn-chatbot-toggle');
  const chatbotWindow        = document.getElementById('chatbot-window');
  const btnChatbotClose      = document.getElementById('btn-chatbot-close');
  const chatbotInputFloat    = document.getElementById('chatbot-input-float');

  const btnRunPredictions    = document.getElementById('btn-run-predictions');
  const predictionsLoader    = document.getElementById('predictions-loader');
  const predictionsProgressFill = document.getElementById('prediction-progress-fill');
  const predictionsOutputContainer = document.getElementById('predictions-output-container');
  const predictionsAiContent = document.getElementById('predictions-ai-content');

  // ---------------------------------------------------------------------------
  // Stadium SVG — Keyboard Accessibility Setup
  // ---------------------------------------------------------------------------
  // Runs once at init time. Makes all sectors and gates reachable via Tab and
  // announces their capacity/wait data to screen readers.
  if (stadiumMap) {
    stadiumMap.querySelectorAll('.stadium-sector').forEach(sec => {
      const id  = sec.getAttribute('id') || sec.getAttribute('data-id') || sec.getAttribute('data-name') || 'Sector';
      const cap = sec.getAttribute('data-capacity') || 'N/A';
      const wait = sec.getAttribute('data-wait') || 'N/A';
      sec.setAttribute('tabindex', '0');
      sec.setAttribute('role', 'img');
      sec.setAttribute('aria-label', `${id}. Capacity: ${cap}. Wait Time: ${wait}.`);
    });
    stadiumMap.querySelectorAll('.map-gate').forEach(gate => {
      const id  = gate.getAttribute('id') || gate.getAttribute('data-id') || 'Gate';
      const cap = gate.getAttribute('data-capacity') || 'N/A';
      const wait = gate.getAttribute('data-wait') || 'N/A';
      gate.setAttribute('tabindex', '0');
      gate.setAttribute('role', 'img');
      gate.setAttribute('aria-label', `${id}. Capacity: ${cap}. Wait Time: ${wait}.`);
    });
  }

  // ---------------------------------------------------------------------------
  // Live Event Feed — Initial Load + Endless Loop
  // ---------------------------------------------------------------------------
  // Sequentially loads the initial event pool entries with staggered delays,
  // then enters an endless loop that replays/extends the pool.
  retroLiveEventsPool.forEach((ev, idx) => {
    setTimeout(() => {
      appendLiveEvent(AppState, ev.type, ev.text);
    }, (idx + 1) * LIVE_EVENT_LOAD_INTERVAL_MS);
  });

  setInterval(() => {
    if (AppState.liveEventIndex < retroLiveEventsPool.length) {
      const ev = retroLiveEventsPool[AppState.liveEventIndex];
      appendLiveEvent(AppState, ev.type, ev.text);
      AppState.liveEventIndex++;
    } else {
      const randEv = retroLiveEventsPool[Math.floor(Math.random() * retroLiveEventsPool.length)];
      appendLiveEvent(AppState, randEv.type, `${randEv.text} (Repeated telemetry loop)`);
    }
  }, LIVE_EVENT_INTERVAL_MS);

  // ---------------------------------------------------------------------------
  // View Selector Toggles (Operations ↔ Fan Concierge)
  // ---------------------------------------------------------------------------
  if (btnStaffView) {
    btnStaffView.addEventListener('click', () => {
      playRetroSound('beep');
      btnStaffView.classList.add('active');
      btnStaffView.setAttribute('aria-pressed', 'true');
      btnFanView.classList.remove('active');
      btnFanView.setAttribute('aria-pressed', 'false');
      staffViewPanel.classList.remove('hidden-panel');
      fanViewPanel.classList.add('hidden-panel');
      AppState.ui.activeView = 'staff';
      announceSR('Switched to Operations Control Panel.');
    });
  }

  if (btnFanView) {
    btnFanView.addEventListener('click', () => {
      playRetroSound('beep');
      btnFanView.classList.add('active');
      btnFanView.setAttribute('aria-pressed', 'true');
      btnStaffView.classList.remove('active');
      btnStaffView.setAttribute('aria-pressed', 'false');
      fanViewPanel.classList.remove('hidden-panel');
      staffViewPanel.classList.add('hidden-panel');
      AppState.ui.activeView = 'fan';

      // Reset chat log and show welcome message on switching to fan view
      if (chatMessagesLog) chatMessagesLog.innerHTML = '';
      appendChatBubble('ai', chatbotLocales[AppState.language].welcome);
      announceSR('Switched to Fan Concierge Hub.');
    });
  }

  // ---------------------------------------------------------------------------
  // SVG Map Overlay Controls
  // ---------------------------------------------------------------------------
  /**
   * Deactivates all map overlay buttons and removes all overlay CSS classes.
   */
  function clearMapClasses() {
    [mapBtnHeatmap, mapBtnAccessibility, mapBtnFacilities].forEach(btn => {
      if (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
    if (stadiumMap) {
      stadiumMap.classList.remove(
        'stadium-map-heatmap',
        'stadium-map-accessibility',
        'stadium-map-facilities'
      );
    }
    AppState.ui.activeMapOverlay = null;
  }

  if (mapBtnHeatmap) {
    mapBtnHeatmap.addEventListener('click', () => {
      playRetroSound('beep');
      clearMapClasses();
      mapBtnHeatmap.classList.add('active');
      mapBtnHeatmap.setAttribute('aria-pressed', 'true');
      if (stadiumMap) stadiumMap.classList.add('stadium-map-heatmap');
      AppState.ui.activeMapOverlay = 'heatmap';
      announceSR('Stadium map overlay set to Heatmap view.');
    });
  }

  if (mapBtnAccessibility) {
    mapBtnAccessibility.addEventListener('click', () => {
      playRetroSound('beep');
      clearMapClasses();
      mapBtnAccessibility.classList.add('active');
      mapBtnAccessibility.setAttribute('aria-pressed', 'true');
      if (stadiumMap) stadiumMap.classList.add('stadium-map-accessibility');
      AppState.ui.activeMapOverlay = 'accessibility';
      announceSR('Stadium map overlay set to Accessible Paths view.');
    });
  }

  if (mapBtnFacilities) {
    mapBtnFacilities.addEventListener('click', () => {
      playRetroSound('beep');
      clearMapClasses();
      mapBtnFacilities.classList.add('active');
      mapBtnFacilities.setAttribute('aria-pressed', 'true');
      if (stadiumMap) stadiumMap.classList.add('stadium-map-facilities');
      AppState.ui.activeMapOverlay = 'facilities';
      announceSR('Stadium map overlay set to Restrooms and Concessions view.');
    });
  }

  // ---------------------------------------------------------------------------
  // Map Tooltip — rAF Throttled Hover Handler
  // ---------------------------------------------------------------------------
  // The bounding rect is cached and only refreshed on window resize to avoid
  // triggering a layout reflow on every mousemove event.
  let cachedMapRect = stadiumMap ? stadiumMap.getBoundingClientRect() : null;
  let tooltipFrameId = null;

  window.addEventListener('resize', () => {
    if (stadiumMap) cachedMapRect = stadiumMap.getBoundingClientRect();
  });

  if (stadiumMap) {
    stadiumMap.addEventListener('mousemove', (e) => {
      const target = e.target.closest('.stadium-sector, .map-gate');
      if (!target) {
        if (tooltipFrameId) cancelAnimationFrame(tooltipFrameId);
        if (mapTooltip) mapTooltip.style.display = 'none';
        return;
      }

      const id       = target.getAttribute('data-id') || target.getAttribute('id');
      const capacity = target.getAttribute('data-capacity') || 'N/A';
      const wait     = target.getAttribute('data-wait') || 'N/A';
      const clientX  = e.clientX;
      const clientY  = e.clientY;

      if (tooltipFrameId) cancelAnimationFrame(tooltipFrameId);

      tooltipFrameId = requestAnimationFrame(() => {
        if (!mapTooltip) return;
        if (tooltipCapacity) tooltipCapacity.textContent = capacity;
        if (tooltipWait)     tooltipWait.textContent = wait;
        const titleEl = mapTooltip.querySelector('.tooltip-title');
        if (titleEl) titleEl.textContent = id;

        if (!cachedMapRect && stadiumMap) cachedMapRect = stadiumMap.getBoundingClientRect();
        const rect = cachedMapRect || { left: 0, top: 0 };
        mapTooltip.style.left    = `${clientX - rect.left + 15}px`;
        mapTooltip.style.top     = `${clientY - rect.top  + 15}px`;
        mapTooltip.style.display = 'block';
      });
    });

    stadiumMap.addEventListener('mouseleave', () => {
      if (tooltipFrameId) cancelAnimationFrame(tooltipFrameId);
      if (mapTooltip) mapTooltip.style.display = 'none';
    });
  }

  // ---------------------------------------------------------------------------
  // Speak Mitigation TTS Button
  // ---------------------------------------------------------------------------
  if (btnSpeakMitigation) {
    btnSpeakMitigation.addEventListener('click', () => {
      playRetroSound('beep');
      if (consoleLog) speakAI(consoleLog.innerText, AppState.language);
    });
  }

  // ---------------------------------------------------------------------------
  // Voice Input (Web Speech API) for Main Chat
  // ---------------------------------------------------------------------------
  AppState.recognition = createSpeechRecognition({
    onStart: () => {
      AppState.isRecording = true;
      if (btnChatMic) btnChatMic.classList.add('recording');
      if (chatInput) chatInput.placeholder = chatbotLocales[AppState.language].voiceStart;
    },
    onResult: (event) => {
      const voiceResult = event.results[0][0].transcript;
      if (chatInput) chatInput.value = voiceResult;
    },
    onEnd: () => {
      AppState.isRecording = false;
      if (btnChatMic) btnChatMic.classList.remove('recording');
      if (chatInput) chatInput.placeholder = 'Type a message or ask stadium questions...';
      // submitUserQuery is imported from chat.js but we trigger it via the input's keypress simulation
      if (chatInput) {
        chatInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
      }
    },
    onError: () => {
      AppState.isRecording = false;
      if (btnChatMic) btnChatMic.classList.remove('recording');
      if (chatInput) chatInput.placeholder = 'Type a message or ask stadium questions...';
    }
  });

  if (btnChatMic) {
    if (AppState.recognition) {
      btnChatMic.addEventListener('click', () => {
        playRetroSound('beep');
        if (AppState.isRecording) {
          AppState.recognition.stop();
        } else {
          AppState.recognition.lang = AppState.language === 'en' ? 'en-US' :
            AppState.language === 'es' ? 'es-ES' : 'en-US';
          AppState.recognition.start();
        }
      });
    } else {
      // Fallback: simulate voice query when Web Speech API is unavailable
      btnChatMic.addEventListener('click', () => {
        btnChatMic.classList.add('recording');
        if (chatInput) chatInput.value = '... simulating voice query for Gate queues ...';
        setTimeout(() => {
          btnChatMic.classList.remove('recording');
          if (chatInput) {
            chatInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
          }
        }, 1500);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Floating Chatbot Widget Toggle / Close
  // ---------------------------------------------------------------------------
  if (btnChatbotToggle) {
    btnChatbotToggle.addEventListener('click', () => {
      playRetroSound('beep');
      const isOpen = chatbotWindow && chatbotWindow.style.display !== 'none';

      if (!isOpen) {
        if (chatbotWindow) chatbotWindow.style.display = 'flex';
        btnChatbotToggle.setAttribute('aria-expanded', 'true');
        _setButtonContent(btnChatbotToggle, 'x', ' Close Chat');
        lucide.createIcons();
        if (chatbotInputFloat) chatbotInputFloat.focus();
        announceSR('AI Concierge chatbot window opened. Focus shifted to chatbot input field.');
      } else {
        _closeChatbotWindow(btnChatbotToggle, chatbotWindow);
      }
    });
  }

  if (btnChatbotClose) {
    btnChatbotClose.addEventListener('click', () => {
      playRetroSound('beep');
      _closeChatbotWindow(btnChatbotToggle, chatbotWindow);
      if (btnChatbotToggle) btnChatbotToggle.focus();
      announceSR('AI Concierge chatbot window closed. Focus returned to chat toggle button.');
    });
  }

  // ---------------------------------------------------------------------------
  // Wayfinding Route Calculator
  // ---------------------------------------------------------------------------
  if (btnCalculateRoute) {
    btnCalculateRoute.addEventListener('click', async () => {
      playRetroSound('beep');

      const gate       = inputGate ? inputGate.value : '';
      const sector     = inputSector ? inputSector.value : '';
      const accessible = checkboxWheelchair ? checkboxWheelchair.checked : false;
      const preference = inputRoutePref ? inputRoutePref.value : 'fastest';

      announceSR(`Calculating optimal route from ${gate} to Sector ${sector}...`);

      // Validate inputs before calling Gemini
      if (!gateCoords[gate] || !sectorCoords[sector]) {
        showToast('Input Error', 'Invalid gate or sector selection.', 'warning');
        return;
      }
      if (!ROUTE_PREFERENCES.includes(preference)) {
        showToast('Input Error', 'Invalid route preference.', 'warning');
        return;
      }

      if (directionsOutputBox) directionsOutputBox.style.display = 'block';
      if (directionsStepsList) {
        directionsStepsList.innerHTML = `
          <li class="direction-step loading-step">
            <span class="ticker-live-dot blinking"></span> [CALCULATING OPTIMAL PATH VECTORS VIA GENAI...]
          </li>
        `;
      }

      const systemPrompt = `You are Vanguard Arena AI Navigation Engine.
      Given an entry gate, seat sector, accessible requirement, and optimization preference, calculate the optimal walking path directions.

      Current Stadium Conditions:
      - Gate A (North): HEAVILY CONGESTED (22m wait, turnstile scanners offline). Detour incoming fans to Gate B or Gate D.
      - Gate B (East): STABLE (4m wait).
      - Gate C (South): MODERATE (11m wait).
      - Gate D (West): MODERATE (8m wait).
      - Sector 104: nearest to Gate B. Ramp 3 on the right is step-free.
      - Concourse restroom 104 has 15m wait. Restrooms near Sector 102/103 have 2m wait.
      - Budweiser Beer concession at Sector 104 has 18m wait. Concourse 105 Taco Arena has 8m wait.

      Return your output in a raw JSON string ONLY containing:
      {
        "time": number (minutes, e.g. 7),
        "distance": number (meters, e.g. 480),
        "steps": [ "Step 1 text...", "Step 2 text..." ],
        "ecoTip": "Sustainability tip/advice..."
      }
      Do NOT output markdown code blocks. Give smart advice: if Gate A is selected, recommend detouring via Gate B or D due to offline scanners. If preference is 'green', suggest recycling spots. If accessible is checked, emphasize elevators and ramp 3.`;

      const userPrompt = `Calculate path from ${gate} to Sector ${sector}. Accessible/Step-Free: ${accessible}. Strategy Preference: ${preference}.`;

      let result = null;
      try {
        const responseText = await queryGemini(systemPrompt, userPrompt);
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        result = JSON.parse(cleanJson);
      } catch (err) {
        console.warn('[Routing] Gemini navigation failed. Simulating local routing.', err);
        result = _simulateLocalRouting(gate, sector, accessible, preference);
      }

      // Render route badge metadata
      const clockBadge = directionsOutputBox ? directionsOutputBox.querySelector('.route-badge:first-child') : null;
      if (clockBadge) {
        clockBadge.innerHTML = `<i data-lucide="clock" aria-hidden="true"></i> <span></span>`;
        clockBadge.querySelector('span').textContent = `${result.time} min walk`;
      }
      const distBadge = directionsOutputBox ? directionsOutputBox.querySelector('.route-badge:last-child') : null;
      if (distBadge) {
        distBadge.innerHTML = `<i data-lucide="footprints" aria-hidden="true"></i> <span></span>`;
        distBadge.querySelector('span').textContent = `${result.distance} meters`;
      }

      // Animate step-by-step directions
      if (directionsStepsList) directionsStepsList.innerHTML = '';
      result.steps.forEach((step, idx) => {
        setTimeout(() => {
          const li = document.createElement('li');
          li.className = 'direction-step';
          li.innerHTML = `<span class="step-num">${idx + 1}.</span> <span></span>`;
          li.querySelector('span:last-child').textContent = step;
          if (directionsStepsList) directionsStepsList.appendChild(li);
          playRetroSound('boop');
        }, idx * 250);
      });

      if (result.ecoTip) {
        setTimeout(() => {
          const li = document.createElement('li');
          li.className = 'direction-step eco-route-tip';
          li.innerHTML = `<i data-lucide="leaf" class="icon-green" aria-hidden="true"></i> <strong>AI ECO ADVICE:</strong> <span></span>`;
          li.querySelector('span').textContent = result.ecoTip;
          if (directionsStepsList) directionsStepsList.appendChild(li);
          lucide.createIcons();
          playRetroSound('success');
        }, result.steps.length * 250 + 100);
      }

      drawRoutePath(gate, sector, accessible);
      appendLiveEvent(AppState, 'nav', `AI routed user from ${gate} to Sec ${sector} (${preference} mode, ${result.time}m).`);
      lucide.createIcons();
      speakAI(`Optimal path generated: ${result.time} minutes walk.`, AppState.language);
      announceSR(`Optimal route calculated: ${result.time} minutes walk, ${result.distance} meters.`);
    });
  }

  // ---------------------------------------------------------------------------
  // Crowd Predictions Runner
  // ---------------------------------------------------------------------------
  if (btnRunPredictions) {
    btnRunPredictions.addEventListener('click', async () => {
      playRetroSound('beep');
      if (predictionsLoader) predictionsLoader.style.display = 'block';
      if (predictionsOutputContainer) predictionsOutputContainer.style.display = 'none';
      if (predictionsProgressFill) predictionsProgressFill.style.width = '0%';

      // Animate progress bar while waiting for Gemini
      let width = 0;
      const interval = setInterval(() => {
        width += Math.floor(Math.random() * 15) + 6;
        if (width >= 100) { width = 100; clearInterval(interval); }
        if (predictionsProgressFill) predictionsProgressFill.style.width = `${width}%`;
      }, 80);

      const systemPrompt = `You are the Vanguard Arena AI Cognitive Engine.
      Compile a stadium operations predictive report for the FIFA World Cup 2026.
      Current Stadium Telemetry:
      - Gate A: heavily congested (22m wait, scanners offline).
      - Gate B: normal flow (4m wait).
      - Gate C: moderate (11m wait).
      - Gate D: moderate (8m wait).
      - Sector 104 restroom: 15m wait. Sector 102/103 restrooms: 2m wait.
      - Concession Sector 104: 18m wait. Concession Sector 105: 8m wait.
      - Match: USA vs England (Score 2-1, 76 mins, crowd density high).
      - Weather: Wind gusting 15mph, light rain forecast, roof open.

      Format output in raw HTML containing ONLY <h4> heading starting with "GenAI Operations Strategy" and a <ul> list with <li> elements. Do NOT use markdown code blocks. Use <strong> for key metrics.`;

      const userPrompt = 'Generate real-time crowd forecasts, optimal gates, and concession load predictions.';

      let predictionHtml = '';
      try {
        predictionHtml = await queryGemini(systemPrompt, userPrompt);
      } catch (err) {
        console.warn('[Predictions] Gemini call failed. Using formula-based local model.', err);
        predictionHtml = _simulateLocalPredictions();
      }

      setTimeout(() => {
        clearInterval(interval);
        if (predictionsProgressFill) predictionsProgressFill.style.width = '100%';
        setTimeout(() => {
          if (predictionsLoader) predictionsLoader.style.display = 'none';
          if (predictionsOutputContainer) predictionsOutputContainer.style.display = 'block';
          if (predictionsAiContent) {
            predictionsAiContent.innerHTML = '';
            predictionsAiContent.appendChild(sanitizeHTML(predictionHtml));
          }
          playRetroSound('success');
          speakAI('AI crowd prediction and gate recommendation completed.', AppState.language);
          appendLiveEvent(AppState, 'system', 'Gemini operational crowd analysis loaded successfully.');
        }, 150);
      }, 1000);
    });
  }

  // ---------------------------------------------------------------------------
  // Fan Navigation Tab Bar Switcher
  // ---------------------------------------------------------------------------
  const tabButtons = [
    { btn: tabBtnAssistant,      content: fanTabAssistant,      name: 'assistant' },
    { btn: tabBtnNavigation,     content: fanTabNavigation,     name: 'navigation' },
    { btn: tabBtnSustainability, content: fanTabSustainability, name: 'sustainability' },
    { btn: tabBtnPredictions,    content: fanTabPredictions,    name: 'predictions' }
  ];

  tabButtons.forEach(tab => {
    if (!tab.btn) return;
    tab.btn.addEventListener('click', () => {
      playRetroSound('beep');

      tabButtons.forEach(t => {
        if (t.btn) { t.btn.classList.remove('active'); t.btn.setAttribute('aria-selected', 'false'); }
        if (t.content) t.content.style.display = 'none';
      });

      tab.btn.classList.add('active');
      tab.btn.setAttribute('aria-selected', 'true');
      if (tab.content) tab.content.style.display = 'block';
      AppState.ui.activeTab = tab.name;

      announceSR(`Switched to ${tab.btn.textContent.trim()} tab.`);

      // Re-render welcome message when returning to assistant tab
      if (tab.name === 'assistant') {
        if (chatMessagesLog) chatMessagesLog.innerHTML = '';
        appendChatBubble('ai', chatbotLocales[AppState.language].welcome);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // window.VanguardOps — Integration Test Surface
  // ---------------------------------------------------------------------------
  // Exposes a stable API surface for unit and E2E tests to call into.
  // Do not rely on this namespace from production code — import modules directly.
  window.VanguardOps = {
    gateCoords,
    sectorCoords,
    /** @returns {string} Local fallback prediction HTML (mirrors Gemini output format). */
    simulateLocalPredictions: _simulateLocalPredictions,
    playRetroSound,
    appendLiveEvent: (type, text) => appendLiveEvent(AppState, type, text),
    showToast,
    drawRoutePath,
    clearRoutePath,
    AppState
  };
});

// ---------------------------------------------------------------------------
// Module-Private Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a local formula-based prediction report when the Gemini API
 * is unavailable. Delegates to calculateCrowdForecast() from predictions.js
 * so the same formula logic is used in both online and offline modes.
 *
 * @returns {string} Raw HTML prediction report string.
 * @private
 */
function _simulateLocalPredictions() {
  // Import AppState inline to avoid circular dependency issues
  // (AppState is already in module scope via the top-level import)
  const { html } = calculateCrowdForecast(AppState.telemetry);
  return html;
}

/**
 * Builds a local fallback route result object when the Gemini Navigation
 * Engine is unavailable. Uses localized step text from chatbotLocales.
 *
 * @param {string}  gate        Selected gate identifier.
 * @param {string}  sector      Selected sector identifier.
 * @param {boolean} accessible  True for wheelchair-accessible routing.
 * @param {string}  preference  Route optimization mode.
 * @returns {{ time: number, distance: number, steps: string[], ecoTip: string }}
 * @private
 */
function _simulateLocalRouting(gate, sector, accessible, preference) {
  let time = 6;
  let distance = 420;
  const steps = [];
  const locale = chatbotLocales[AppState.language] || chatbotLocales['en'];
  const gateLocale = _getGateDetourLocale();

  if (gate === 'Gate A') {
    time = 14;
    distance = 960;
    steps.push(gateLocale.detourGateA);
    steps.push(locale.stepGate);
  } else {
    steps.push(locale.stepGate);
  }

  steps.push(locale.stepConcourse);
  steps.push(locale.stepTurn);
  steps.push(accessible ? locale.stepWheelchair : locale.stepRamp);
  steps.push(locale.stepSeat);

  const ecoTip = preference === 'green'
    ? 'Eco-routing active: Pass by Concourse B recycling node to receive double Green points!'
    : 'Keep the planet green! Use public transit platforms near Gate B East for 0-emission egress.';

  return { time, distance, steps, ecoTip };
}

/**
 * Returns the localized Gate A detour message for the current language.
 * Falls back to English if the current language is not mapped.
 *
 * @returns {{ detourGateA: string }} Locale object with the detour string.
 * @private
 */
function _getGateDetourLocale() {
  const detourMessages = {
    en: 'Detour active: Turnstile WAN outages detected at Gate A. Rerouting via Gate B concourse corridor.',
    es: 'Desvío activo: Caídas de red WAN en Puerta A. Desviando por pasillo de Puerta B.',
    pt: 'Desvio ativo: Queda de rede no Portão A. Roteando pelo corredor do Portão B.',
    de: 'Umleitung aktiv: Netzwerkfehler an Tor A. Umleitung über Tor B Gang.',
    fr: 'Déviation active : Panne réseau à la Porte A. Redirection via le couloir de la Porte B.',
    ar: 'تحويل مسار نشط: انقطاع شبكة البوابة A. إعادة توجيه عبر ممر البوابة B.',
    ja: '迂回ルート案内：ゲートAのシステム障害のため、ゲートBコンコース経由で案内します。'
  };
  const lang = AppState.language;
  return { detourGateA: detourMessages[lang] || detourMessages['en'] };
}

/**
 * Safely sets a button's content to a Lucide icon + text label.
 * Avoids innerHTML on buttons to prevent XSS via dynamic label strings.
 *
 * @param {HTMLButtonElement} btn      Target button element.
 * @param {string}            iconName Lucide icon name.
 * @param {string}            label    Text label appended after the icon.
 * @private
 */
function _setButtonContent(btn, iconName, label) {
  if (!btn) return;
  btn.innerHTML = '';
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', iconName);
  icon.setAttribute('aria-hidden', 'true');
  btn.appendChild(icon);
  btn.appendChild(document.createTextNode(label));
}

/**
 * Hides the floating chatbot window and resets the toggle button state.
 *
 * @param {HTMLButtonElement} toggleBtn   The chatbot toggle button.
 * @param {HTMLElement}       windowEl    The chatbot window element.
 * @private
 */
function _closeChatbotWindow(toggleBtn, windowEl) {
  if (windowEl) windowEl.style.display = 'none';
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', 'false');
    _setButtonContent(toggleBtn, 'sparkles', ' AI Concierge');
    lucide.createIcons();
  }
  announceSR('AI Concierge chatbot window closed.');
}
