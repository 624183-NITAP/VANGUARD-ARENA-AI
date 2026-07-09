/**
 * VANGUARD ARENA AI - APPLICATION ENGINE
 * Core coordinator script that manages user interfaces, telemetry updates,
 * AI concierge assistant, SVG stadium mapping, and carbon-reward trackers.
 */
"use strict";

import {
  sectorCoords,
  gateCoords,
  incidentResolutions,
  dynamicEcoTips,
  chatbotLocales,
  searchKeywords,
  fallbackLocales,
  customIncidentsList,
  retroLiveEventsPool
} from './config.js';

import {
  formatChatText,
  setHealthStatus,
  sanitizeHTML
} from './utils.js';

import { queryGemini } from './api.js';
import { playRetroSound } from './sound.js';
import { speakAI, createSpeechRecognition } from './speech.js';
import { drawRoutePath, clearRoutePath } from './map.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // --- STATE VARIABLES ---
  let currentLanguage = 'en';
  let activeIncidentId = '1';
  let isRecording = false;
  let activeTab = 'assistant'; // assistant, navigation, sustainability
  let totalEcoPoints = 120;
  let customIncidentCounter = 3;
  let liveEventIndex = 0;
  let recognition = null;

  // --- HTML DOM ELEMENT SELECTORS ---
  const btnStaffView = document.getElementById('btn-staff-view');
  const btnFanView = document.getElementById('btn-fan-view');
  const staffViewPanel = document.getElementById('staff-view-panel');
  const fanViewPanel = document.getElementById('fan-view-panel');
  
  const mapBtnHeatmap = document.getElementById('map-btn-heatmap');
  const mapBtnAccessibility = document.getElementById('map-btn-accessibility');
  const mapBtnFacilities = document.getElementById('map-btn-facilities');
  const stadiumMap = document.getElementById('stadium-map');

  const mapTooltip = document.getElementById('map-tooltip');
  const tooltipCapacity = document.getElementById('tooltip-capacity');
  const tooltipWait = document.getElementById('tooltip-wait');

  const incidentContainer = document.getElementById('incident-container');
  const btnTriggerIncident = document.getElementById('btn-trigger-incident');
  const consoleLog = document.getElementById('console-log');
  const consoleStatusText = document.getElementById('console-status-text');
  const consoleFooter = document.getElementById('console-footer');
  const btnSpeakMitigation = document.getElementById('btn-speak-mitigation');
  const btnDispatchAction = document.getElementById('btn-dispatch-action');

  const chatMessagesLog = document.getElementById('chat-messages-log');
  const chatInput = document.getElementById('chat-input');
  const btnChatSend = document.getElementById('btn-chat-send');
  const btnChatMic = document.getElementById('btn-chat-mic');
  const quickChips = document.getElementById('quick-chips');

  const tabBtnAssistant = document.getElementById('tab-btn-assistant');
  const tabBtnNavigation = document.getElementById('tab-btn-navigation');
  const tabBtnSustainability = document.getElementById('tab-btn-sustainability');
  const tabBtnPredictions = document.getElementById('tab-btn-predictions');

  const fanTabAssistant = document.getElementById('fan-tab-assistant');
  const fanTabNavigation = document.getElementById('fan-tab-navigation');
  const fanTabSustainability = document.getElementById('fan-tab-sustainability');
  const fanTabPredictions = document.getElementById('fan-tab-predictions');

  const inputGate = document.getElementById('input-gate');
  const inputSector = document.getElementById('input-sector');
  const checkboxWheelchair = document.getElementById('checkbox-wheelchair');
  const inputRoutePref = document.getElementById('input-route-pref');
  const btnCalculateRoute = document.getElementById('btn-calculate-route');
  
  const directionsOutputBox = document.getElementById('directions-output-box');
  const directionsStepsList = document.getElementById('directions-steps-list');

  const selectTransitMode = document.getElementById('select-transit-mode');
  const btnCalculateEco = document.getElementById('btn-calculate-eco');
  const greenScoreStat = document.getElementById('green-score-stat');
  const btnNewEcoTip = document.getElementById('btn-new-eco-tip');
  const ecoTipBox = document.getElementById('eco-tip-box');

  const btnAccessibilityMode = document.getElementById('btn-accessibility-mode');
  
  const btnChatbotToggle = document.getElementById('btn-chatbot-toggle');
  const chatbotWindow = document.getElementById('chatbot-window');
  const btnChatbotClose = document.getElementById('btn-chatbot-close');
  const chatbotInputFloat = document.getElementById('chatbot-input-float');
  const btnChatbotSendFloat = document.getElementById('btn-chatbot-send-float');
  const chatbotMessagesFloatLog = document.getElementById('chatbot-messages-float-log');
  const langButtonsFloat = document.querySelectorAll('.lang-btn-float');

  const btnRunPredictions = document.getElementById('btn-run-predictions');
  const predictionsLoader = document.getElementById('predictions-loader');
  const predictionsProgressFill = document.getElementById('prediction-progress-fill');
  const predictionsOutputContainer = document.getElementById('predictions-output-container');
  const predictionsAiContent = document.getElementById('predictions-ai-content');
  const predictionsStatusText = document.getElementById('predictions-status-text');

  // --- SCREEN READER ANNOUNCER ---
  function announceSR(text) {
    const announcer = document.getElementById('accessibility-announcer');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = text;
      }, 50);
    }
  }

  // --- STADIUM SVG KEYBOARD ACCESSIBILITY OVERRIDES ---
  if (stadiumMap) {
    const sectors = stadiumMap.querySelectorAll('.stadium-sector');
    sectors.forEach(sec => {
      const id = sec.getAttribute('id') || sec.getAttribute('data-id') || sec.getAttribute('data-name') || 'Sector';
      const cap = sec.getAttribute('data-capacity') || 'N/A';
      const wait = sec.getAttribute('data-wait') || 'N/A';
      sec.setAttribute('tabindex', '0');
      sec.setAttribute('role', 'img');
      sec.setAttribute('aria-label', `${id}. Capacity: ${cap}. Wait Time: ${wait}.`);
    });

    const gates = stadiumMap.querySelectorAll('.map-gate');
    gates.forEach(gate => {
      const id = gate.getAttribute('id') || gate.getAttribute('data-id') || 'Gate';
      const cap = gate.getAttribute('data-capacity') || 'N/A';
      const wait = gate.getAttribute('data-wait') || 'N/A';
      gate.setAttribute('tabindex', '0');
      gate.setAttribute('role', 'img');
      gate.setAttribute('aria-label', `${id}. Capacity: ${cap}. Wait Time: ${wait}.`);
    });
  }

  // --- DYNAMIC TELEMETRY HUB LOOPS ---
  function initAdvancedTelemetryHub() {
    // Cache stadium sector DOM references to minimize layout thrashing
    const sectors = stadiumMap ? stadiumMap.querySelectorAll('.stadium-sector') : [];
    
    // 1. Dynamic Heatmap Opacity Breathing Loop
    setInterval(() => {
      const isHeatmapActive = stadiumMap.classList.contains('stadium-map-heatmap');
      if (!isHeatmapActive) return;
      
      sectors.forEach(sec => {
        const baseOpacity = parseFloat(sec.getAttribute('fill-opacity') || '0.55');
        const delta = (Math.random() - 0.5) * 0.08;
        const newOpacity = Math.max(0.35, Math.min(0.85, baseOpacity + delta));
        sec.style.fillOpacity = newOpacity;
      });
    }, 1200);

    // 2. Health Bar Fluctuations
    const healthAI = document.getElementById('health-ai');
    const healthIoT = document.getElementById('health-iot');
    const healthCCTV = document.getElementById('health-cctv');
    const healthWeather = document.getElementById('health-weather');
    const healthNetwork = document.getElementById('health-network');
    
    setInterval(() => {
      // AI Confidence
      const aiConf = (99.0 + Math.random() * 0.9).toFixed(2);
      if (healthAI) {
        setHealthStatus(healthAI, `${aiConf}% NOMINAL`);
      }
      
      // IoT count
      const iotCount = 412 - Math.floor(Math.random() * 3);
      if (healthIoT) {
        setHealthStatus(healthIoT, `ACTIVE (${iotCount}/412)`);
      }
      
      // CCTV Feed
      const cctvCount = 64 - Math.floor(Math.random() * 2);
      if (healthCCTV) {
        if (cctvCount < 64) {
          healthCCTV.className = "health-status status-degraded";
          setHealthStatus(healthCCTV, `DEGRADED (${cctvCount}/64)`);
        } else {
          healthCCTV.className = "health-status status-nominal";
          setHealthStatus(healthCCTV, "ONLINE (64/64)");
        }
      }
      
      // Weather Station Temp
      const temp = 66 + Math.floor(Math.random() * 4);
      if (healthWeather) {
        setHealthStatus(healthWeather, `OPEN ROOF (${temp}°F)`);
      }
      
      // Latency
      const latency = 8 + Math.floor(Math.random() * 12);
      if (healthNetwork) {
        if (latency > 15) {
          healthNetwork.className = "health-status status-degraded";
          setHealthStatus(healthNetwork, `DEGRADED (5G / ${latency}ms)`);
        } else {
          healthNetwork.className = "health-status status-nominal";
          setHealthStatus(healthNetwork, `STABLE (5G / ${latency}ms)`);
        }
      }
    }, 4000);
  }

  initAdvancedTelemetryHub();

  // --- TOAST NOTIFICATIONS ---
  function showToast(title, text, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'alert') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';
    if (type === 'system') iconName = 'shield-check';
    
    toast.innerHTML = `
      <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
      <div class="toast-body">
        <strong class="toast-title"></strong>
        <div class="toast-text"></div>
      </div>
    `;
    toast.querySelector('.toast-title').textContent = title;
    toast.querySelector('.toast-text').textContent = text;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
      toast.style.animation = 'toast-fade-out 0.3s forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4500);
  }

  // --- LIVE EVENT FEED GENERATOR ---
  function appendLiveEvent(type, text) {
    const container = document.getElementById('live-event-feed-container');
    if (!container) return;
    
    const placeholder = container.querySelector('.feed-placeholder');
    if (placeholder) placeholder.remove();
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const line = document.createElement('div');
    line.className = 'feed-log-line';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'feed-time';
    timeSpan.textContent = timeStr;
    
    const tagSpan = document.createElement('span');
    tagSpan.className = `feed-tag tag-${type}`;
    tagSpan.textContent = type;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'feed-text';
    textSpan.textContent = text;
    
    line.appendChild(timeSpan);
    line.appendChild(document.createTextNode(' '));
    line.appendChild(tagSpan);
    line.appendChild(document.createTextNode(' '));
    line.appendChild(textSpan);
    
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
    
    if (type === 'alert' || type === 'security') {
      playRetroSound('warn');
    } else if (type === 'transit' || type === 'weather') {
      playRetroSound('beep');
    } else {
      playRetroSound('boop');
    }

    if (type === 'alert') {
      showToast("System Alert", text, "warning");
    } else if (type === 'security') {
      showToast("Security Dispatch", text, "alert");
    } else if (type === 'transit') {
      showToast("Transit Dispatch", text, "system");
    } else if (type === 'weather') {
      showToast("Environmental Update", text, "system");
    }
  }

  // Load Initial Event Stream Sequentially
  retroLiveEventsPool.forEach((ev, idx) => {
    setTimeout(() => {
      appendLiveEvent(ev.type, ev.text);
    }, (idx + 1) * 3500);
  });

  // Endless Random Events telemetry appending
  setInterval(() => {
    if (liveEventIndex < retroLiveEventsPool.length) {
      const ev = retroLiveEventsPool[liveEventIndex];
      appendLiveEvent(ev.type, ev.text);
      liveEventIndex++;
    } else {
      const randEv = retroLiveEventsPool[Math.floor(Math.random() * retroLiveEventsPool.length)];
      appendLiveEvent(randEv.type, randEv.text + " (Repeated telemetry loop)");
    }
  }, 18000);

  // --- STAFF INCIDENT & AI DISPATCH SYSTEM ---
  incidentContainer.addEventListener('click', (e) => {
    const solveBtn = e.target.closest('.btn-incident-solve');
    if (!solveBtn) return;
    
    playRetroSound('beep');
    document.querySelectorAll('.btn-incident-solve').forEach(btn => btn.classList.remove('active-solve'));
    document.querySelectorAll('.incident-row').forEach(row => row.classList.remove('active-row'));

    solveBtn.classList.add('active-solve');
    const row = solveBtn.closest('.incident-row');
    row.classList.add('active-row');

    activeIncidentId = solveBtn.getAttribute('data-incident-id');
    runIncidentMitigation(activeIncidentId);
  });

  async function runIncidentMitigation(id) {
    if (!id || typeof id !== 'string' || !/^\d+$/.test(id)) {
      showToast("Validation Error", "Invalid incident identifier.", "warning");
      return;
    }

    consoleStatusText.textContent = "GenAI computing...";
    
    consoleLog.innerHTML = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'console-placeholder-msg';
    const dot = document.createElement('span');
    dot.className = 'ticker-live-dot';
    placeholder.appendChild(dot);
    placeholder.appendChild(document.createTextNode(' Generating operational response vector via Gemini 1.5 Flash...'));
    consoleLog.appendChild(placeholder);
    
    consoleFooter.style.display = 'none';

    // Get current incident row details
    const activeRow = document.querySelector(`.incident-row.active-row`);
    const title = activeRow ? activeRow.querySelector('.incident-title').textContent : "Stadium Incident";
    const desc = activeRow ? activeRow.querySelector('.incident-desc').textContent : "Unspecified operational anomaly";
    const locNode = activeRow ? activeRow.querySelector('.incident-loc') : null;
    const location = locNode ? locNode.textContent.trim() : "Stadium";

    const systemPrompt = `You are Vanguard Arena AI, an operational decision support system for stadium management during the FIFA World Cup 2026 at MetLife Stadium.
    Generate a highly tactical and concise mitigation action plan for stadium coordinators.
    The output MUST be raw HTML containing ONLY <h4> heading starting with "GenAI Operations Recommendation" and a <ul> list containing several <li> items.
    Do NOT wrap the output in markdown blocks like \`\`\`html.
    Use <strong> tag to highlight key personnel or actions. 
    Ensure you provide:
    1. Immediate containment step (queue diverting, hardware re-routing).
    2. Digital broadcast alerts/updates for affected seating sectors.
    3. Mobilization and dispatch matching for closest volunteer IDs.
    4. Hardware recovery or safety inspection step.`;

    const userPrompt = `An incident occurred: "${title}" at "${location}". Details: "${desc}".`;

    try {
      const responseHtml = await queryGemini(systemPrompt, userPrompt);
      consoleStatusText.textContent = "Resolution generated (100% confidence)";
      consoleLog.innerHTML = '';
      consoleLog.appendChild(sanitizeHTML(responseHtml));
      consoleFooter.style.display = 'flex';
      playRetroSound('success');
    } catch (err) {
      console.warn("Gemini API call failed for mitigation. Using high-fidelity local response.", err);
      const data = incidentResolutions[id];
      if (data) {
        consoleStatusText.textContent = "Resolution generated (Local Fallback)";
        consoleLog.innerHTML = '';
        consoleLog.appendChild(sanitizeHTML(data.resolution));
      } else {
        consoleStatusText.textContent = "Simulation completed";
        consoleLog.innerHTML = '';
        consoleLog.appendChild(sanitizeHTML(`<h4>Custom GenAI Response (Fallback)</h4><p>Containment procedures logged. Redirection notices pushed to active fan tickets in near sectors.</p>`));
      }
      consoleFooter.style.display = 'flex';
      playRetroSound('success');
    }

    if (id === '1') {
      highlightStadiumElement('Gate A', true);
    } else if (id === '2') {
      highlightStadiumElement('104', true);
    }
  }

  // Trigger Custom Incidents loop from config lists
  btnTriggerIncident.addEventListener('click', () => {
    playRetroSound('beep');
    const items = customIncidentsList;
    const pick = items[Math.floor(Math.random() * items.length)];
    const id = customIncidentCounter.toString();
    customIncidentCounter++;

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

    // Auto solve trigger
    document.querySelectorAll('.btn-incident-solve').forEach(btn => btn.classList.remove('active-solve'));
    document.querySelectorAll('.incident-row').forEach(r => r.classList.remove('active-row'));
    row.querySelector('.btn-incident-solve').classList.add('active-solve');
    row.classList.add('active-row');
    
    activeIncidentId = id;
    runIncidentMitigation(activeIncidentId);
    appendLiveEvent('security', `Incident logged: ${pick.title} at ${pick.loc}.`);
  });

  // Action dispatches simulation
  btnDispatchAction.addEventListener('click', () => {
    playRetroSound('success');
    showToast("Incident Dispatched", "Operations command broadcasted to area volunteers.", "system");
    appendLiveEvent('system', `Dispatch order pushed successfully for telemetry Incident ID #${activeIncidentId}.`);
    
    const activeRow = document.querySelector(`.incident-row.active-row`);
    if (activeRow) {
      activeRow.classList.remove('priority-high', 'priority-warning');
      activeRow.classList.add('resolved-row');
      const badge = activeRow.querySelector('.badge');
      if (badge) {
        badge.className = "badge badge-resolved";
        badge.textContent = "RESOLVED";
      }
    }
    consoleLog.innerHTML = `<div class="console-placeholder-msg"><i data-lucide="check-circle" class="icon-green"></i> Mitigations executed. Incident closed.</div>`;
    consoleFooter.style.display = 'none';
    lucide.createIcons();
    clearHighlightedStadiumElements();
  });

  // Speak mitigation text-to-speech button
  btnSpeakMitigation.addEventListener('click', () => {
    playRetroSound('beep');
    const textContent = consoleLog.innerText;
    speakAI(textContent, currentLanguage);
  });

  // --- VIEW SELECTOR TOGGLES ---
  btnStaffView.addEventListener('click', () => {
    playRetroSound('beep');
    btnStaffView.classList.add('active');
    btnStaffView.setAttribute('aria-pressed', 'true');
    btnFanView.classList.remove('active');
    btnFanView.setAttribute('aria-pressed', 'false');
    staffViewPanel.classList.remove('hidden-panel');
    fanViewPanel.classList.add('hidden-panel');
    announceSR("Switched to Operations Control Panel.");
  });

  btnFanView.addEventListener('click', () => {
    playRetroSound('beep');
    btnFanView.classList.add('active');
    btnFanView.setAttribute('aria-pressed', 'true');
    btnStaffView.classList.remove('active');
    btnStaffView.setAttribute('aria-pressed', 'false');
    fanViewPanel.classList.remove('hidden-panel');
    staffViewPanel.classList.add('hidden-panel');
    
    // Welcome message init in Chat
    clearChatLog();
    const welcomeMsg = chatbotLocales[currentLanguage].welcome;
    appendChatBubble('ai', welcomeMsg);
    announceSR("Switched to Fan Concierge Hub.");
  });

  // --- SVG MAP OVERLAY STYLING ---
  mapBtnHeatmap.addEventListener('click', () => {
    playRetroSound('beep');
    clearMapClasses();
    mapBtnHeatmap.classList.add('active');
    mapBtnHeatmap.setAttribute('aria-pressed', 'true');
    stadiumMap.classList.add('stadium-map-heatmap');
    announceSR("Stadium map overlay set to Heatmap view.");
  });

  mapBtnAccessibility.addEventListener('click', () => {
    playRetroSound('beep');
    clearMapClasses();
    mapBtnAccessibility.classList.add('active');
    mapBtnAccessibility.setAttribute('aria-pressed', 'true');
    stadiumMap.classList.add('stadium-map-accessibility');
    announceSR("Stadium map overlay set to Accessible Paths view.");
  });

  mapBtnFacilities.addEventListener('click', () => {
    playRetroSound('beep');
    clearMapClasses();
    mapBtnFacilities.classList.add('active');
    mapBtnFacilities.setAttribute('aria-pressed', 'true');
    stadiumMap.classList.add('stadium-map-facilities');
    announceSR("Stadium map overlay set to Restrooms and Concessions view.");
  });

  function clearMapClasses() {
    mapBtnHeatmap.classList.remove('active');
    mapBtnAccessibility.classList.remove('active');
    mapBtnFacilities.classList.remove('active');
    mapBtnHeatmap.setAttribute('aria-pressed', 'false');
    mapBtnAccessibility.setAttribute('aria-pressed', 'false');
    mapBtnFacilities.setAttribute('aria-pressed', 'false');
    stadiumMap.classList.remove('stadium-map-heatmap', 'stadium-map-accessibility', 'stadium-map-facilities');
  }

  // Cache the map bounding rect and recalibrate only on resize to prevent layout thrashing
  let cachedMapRect = stadiumMap ? stadiumMap.getBoundingClientRect() : null;
  window.addEventListener('resize', () => {
    if (stadiumMap) {
      cachedMapRect = stadiumMap.getBoundingClientRect();
    }
  });

  let tooltipFrameId = null;

  // Map Hover tooltip listener throttled via requestAnimationFrame
  stadiumMap.addEventListener('mousemove', (e) => {
    const target = e.target.closest('.stadium-sector, .map-gate');
    if (!target) {
      if (tooltipFrameId) cancelAnimationFrame(tooltipFrameId);
      mapTooltip.style.display = 'none';
      return;
    }
    
    const id = target.getAttribute('data-id') || target.getAttribute('id');
    const capacity = target.getAttribute('data-capacity') || "N/A";
    const wait = target.getAttribute('data-wait') || "N/A";
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    if (tooltipFrameId) cancelAnimationFrame(tooltipFrameId);
    
    tooltipFrameId = requestAnimationFrame(() => {
      tooltipCapacity.textContent = capacity;
      tooltipWait.textContent = wait;
      const titleEl = mapTooltip.querySelector('.tooltip-title');
      if (titleEl) titleEl.textContent = id;
      
      mapTooltip.style.display = 'block';
      if (!cachedMapRect && stadiumMap) {
        cachedMapRect = stadiumMap.getBoundingClientRect();
      }
      const rect = cachedMapRect || { left: 0, top: 0 };
      const x = clientX - rect.left + 15;
      const y = clientY - rect.top + 15;
      mapTooltip.style.left = `${x}px`;
      mapTooltip.style.top = `${y}px`;
    });
  });

  stadiumMap.addEventListener('mouseleave', () => {
    if (tooltipFrameId) cancelAnimationFrame(tooltipFrameId);
    mapTooltip.style.display = 'none';
  });

  function highlightStadiumElement(id, zoom = false) {
    clearHighlightedStadiumElements();
    const el = document.getElementById(id) || document.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('highlighted-active');
      if (zoom) {
        el.style.transform = 'scale(1.03)';
        setTimeout(() => el.style.transform = '', 2000);
      }
    }
  }

  function clearHighlightedStadiumElements() {
    document.querySelectorAll('.stadium-sector, .map-gate').forEach(el => {
      el.classList.remove('highlighted-active');
    });
  }

  // --- FAN ASSISTANT INTERFACE ---
  function clearChatLog() {
    chatMessagesLog.innerHTML = '';
  }

  function appendChatBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}-bubble`;
    
    let confidenceHtml = "";
    if (sender === 'ai') {
      const score = (98.0 + Math.random() * 1.9).toFixed(1);
      confidenceHtml = `<div class="ai-confidence-badge">CONF: ${score}%</div>`;
    }
    
    bubble.innerHTML = `
      <div class="chat-bubble-avatar">
        <i data-lucide="${sender === 'ai' ? 'cpu' : 'user'}"></i>
        ${confidenceHtml}
      </div>
      <div class="chat-bubble-text"></div>
    `;
    bubble.querySelector('.chat-bubble-text').innerHTML = formatChatText(text);
    chatMessagesLog.appendChild(bubble);
    chatMessagesLog.scrollTop = chatMessagesLog.scrollHeight;
    lucide.createIcons();
  }

  btnChatSend.addEventListener('click', () => {
    playRetroSound('beep');
    submitUserQuery();
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitUserQuery();
    }
  });

  quickChips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    playRetroSound('beep');
    const query = btn.getAttribute('data-query');
    chatInput.value = query;
    submitUserQuery();
  });

  async function submitUserQuery() {
    let query = chatInput.value.trim();
    if (!query) return;

    if (query.length > 1000) {
      query = query.substring(0, 1000);
    }

    appendChatBubble('user', query);
    chatInput.value = '';

    // Typing loading status bubble
    const typingBubble = document.createElement('div');
    typingBubble.className = `chat-bubble ai-bubble typing-bubble`;
    typingBubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="cpu"></i></div>
      <div class="chat-bubble-text">
        <div class="ai-spinner-container">
          <span class="ai-spinner-icon"><i data-lucide="refresh-cw"></i></span>
          <span>[AI COGNITIVE CORE ANALYZING USER QUERY...]</span>
        </div>
      </div>
    `;
    chatMessagesLog.appendChild(typingBubble);
    chatMessagesLog.scrollTop = chatMessagesLog.scrollHeight;
    lucide.createIcons();

    // Prepare Gemini Prompt Context
    const systemPrompt = `You are Vanguard Arena AI, the official tournament concierge for the FIFA World Cup 2026 at MetLife Stadium.
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
    
    Respond to the user's question directly in the requested language: "${currentLanguage}".
    Keep your answers clear, professional, and very concise (maximum of 3 sentences or a short bulleted list), unless they ask for specific complex directions. Make sure you use markdown bolding (e.g., **Gate B**) where appropriate. Do not output code blocks.`;

    let reply = "";
    try {
      reply = await queryGemini(systemPrompt, query);
    } catch (err) {
      console.warn("Gemini API call failed for chat. Using local response engine fallback.", err);
      reply = generateGenAIResponse(query);
      await new Promise(r => setTimeout(r, 800));
    }

    typingBubble.remove();
    appendChatBubble('ai', reply);
    speakAI(reply.replace(/\*\*|\*/g, ''), currentLanguage);
  }

  function generateGenAIResponse(query) {
    const textLower = query.toLowerCase();
    
    let matchKey = '';
    if (textLower.includes('gate') || textLower.includes('entry') || textLower.includes('wait') || textLower.includes('queue') || textLower.includes('puerta') || textLower.includes('portão') || textLower.includes('tor') || textLower.includes('بوابة') || textLower.includes('ゲート')) {
      matchKey = 'gate';
    } else if (textLower.includes('seat') || textLower.includes('sector') || textLower.includes('row') || textLower.includes('platform') || textLower.includes('asiento') || textLower.includes('assento') || textLower.includes('sitz') || textLower.includes('قطاع') || textLower.includes('座席') || textLower.includes('セクター')) {
      matchKey = 'sector';
    } else if (textLower.includes('access') || textLower.includes('wheelchair') || textLower.includes('silla de ruedas') || textLower.includes('cadeira') || textLower.includes('barrierefrei') || textLower.includes('handicap') || textLower.includes('احتياجات') || textLower.includes('車椅子') || textLower.includes('バリアフリー')) {
      matchKey = 'accessibility';
    } else if (textLower.includes('transit') || textLower.includes('train') || textLower.includes('bus') || textLower.includes('transport') || textLower.includes('tren') || textLower.includes('ônibus') || textLower.includes('zug') || textLower.includes('نقل') || textLower.includes('電車') || textLower.includes('バス')) {
      matchKey = 'transit';
    }

    if (matchKey && searchKeywords[matchKey][currentLanguage]) {
      return searchKeywords[matchKey][currentLanguage];
    }
    return fallbackLocales[currentLanguage] || fallbackLocales['en'];
  }

  // --- AUDIO SYNTHESIS & SPEECH INPUT (WEB SPEECH API) ---
  recognition = createSpeechRecognition({
    onStart: () => {
      isRecording = true;
      btnChatMic.classList.add('recording');
      chatInput.placeholder = chatbotLocales[currentLanguage].voiceStart;
    },
    onResult: (event) => {
      const voiceResult = event.results[0][0].transcript;
      chatInput.value = voiceResult;
    },
    onEnd: () => {
      isRecording = false;
      btnChatMic.classList.remove('recording');
      chatInput.placeholder = "Type a message or ask stadium questions...";
      submitUserQuery();
    },
    onError: () => {
      isRecording = false;
      btnChatMic.classList.remove('recording');
      chatInput.placeholder = "Type a message or ask stadium questions...";
    }
  });

  if (recognition) {
    btnChatMic.addEventListener('click', () => {
      playRetroSound('beep');
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.lang = currentLanguage === 'en' ? 'en-US' : (currentLanguage === 'es' ? 'es-ES' : 'en-US');
        recognition.start();
      }
    });
  } else {
    btnChatMic.addEventListener('click', () => {
      btnChatMic.classList.add('recording');
      chatInput.value = "... simulating voice query for Gate queues ...";
      setTimeout(() => {
        btnChatMic.classList.remove('recording');
        submitUserQuery();
      }, 1500);
    });
  }

  // --- SEAT WAYFINDING ROUTING ALGORITHM ---
  btnCalculateRoute.addEventListener('click', async () => {
    playRetroSound('beep');
    const gate = inputGate.value;
    const sector = inputSector.value;
    announceSR(`Calculating optimal route path from ${gate} to Sector ${sector}...`);
    const accessible = checkboxWheelchair.checked;
    const preference = inputRoutePref.value;

    // Input validation
    if (!gateCoords[gate] || !sectorCoords[sector]) {
      showToast("Input Error", "Invalid gate or sector selection.", "warning");
      return;
    }
    const allowedPrefs = ['fastest', 'crowd-avoidance', 'green'];
    if (!allowedPrefs.includes(preference)) {
      showToast("Input Error", "Invalid route preference.", "warning");
      return;
    }

    directionsOutputBox.style.display = 'block';
    directionsStepsList.innerHTML = `
      <li class="direction-step loading-step">
        <span class="ticker-live-dot blinking"></span> [CALCULATING OPTIMAL PATH VECTORS VIA GENAI...]
      </li>
    `;

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
      "steps": [
        "Step 1 text...",
        "Step 2 text..."
      ],
      "ecoTip": "Sustainability tip/advice..."
    }
    Do NOT output markdown code blocks. Give smart advice: e.g., if Gate A is selected, recommend detouring via Gate B or D due to offline scanners. If preference is 'green', suggest recycling spots or clean concessions. If accessible is checked, emphasize elevators and ramp 3.`;

    const userPrompt = `Calculate path from ${gate} to Sector ${sector}. Accessible/Step-Free: ${accessible}. Strategy Preference: ${preference}.`;
    
    let result = null;
    try {
      const responseText = await queryGemini(systemPrompt, userPrompt);
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (err) {
      console.warn("Gemini API call failed for route planner. Simulating local routing.", err);
      result = simulateLocalRouting(gate, sector, accessible, preference);
    }

    const clockBadge = directionsOutputBox.querySelector('.route-badge:first-child');
    clockBadge.innerHTML = `<i data-lucide="clock"></i> <span></span>`;
    clockBadge.querySelector('span').textContent = `${result.time} min walk`;

    const distBadge = directionsOutputBox.querySelector('.route-badge:last-child');
    distBadge.innerHTML = `<i data-lucide="footprints"></i> <span></span>`;
    distBadge.querySelector('span').textContent = `${result.distance} meters`;

    directionsStepsList.innerHTML = '';
    
    result.steps.forEach((step, idx) => {
      setTimeout(() => {
        const li = document.createElement('li');
        li.className = 'direction-step';
        li.innerHTML = `<span class="step-num">${idx + 1}.</span> <span></span>`;
        li.querySelector('span').textContent = step;
        directionsStepsList.appendChild(li);
        playRetroSound('boop');
      }, idx * 250);
    });

    if (result.ecoTip) {
      setTimeout(() => {
        const li = document.createElement('li');
        li.className = 'direction-step eco-route-tip';
        li.innerHTML = `<i data-lucide="leaf" class="icon-green"></i> <strong>AI ECO ADVICE:</strong> <span></span>`;
        li.querySelector('span').textContent = result.ecoTip;
        directionsStepsList.appendChild(li);
        lucide.createIcons();
        playRetroSound('success');
      }, result.steps.length * 250 + 100);
    }

    drawRoutePath(gate, sector, accessible);
    appendLiveEvent('nav', `AI routed user from ${gate} to Sec ${sector} (${preference} mode, ${result.time}m).`);

    lucide.createIcons();
    speakAI(`Optimal path generated: ${result.time} minutes walk.`, currentLanguage);
    announceSR(`Optimal route calculated: ${result.time} minutes walk, ${result.distance} meters. Detailed directions loaded in wayfinding panel.`);
  });

  function simulateLocalRouting(gate, sector, accessible, preference) {
    let time = 6;
    let distance = 420;
    const steps = [];
    
    const gateLoc = gateLocales();
    const accessibilityLoc = chatbotLocales[currentLanguage];

    if (gate === 'Gate A') {
      time = 14;
      distance = 960;
      steps.push(gateLoc.detourGateA);
      steps.push(accessibilityLoc.stepGate);
    } else {
      steps.push(accessibilityLoc.stepGate);
    }
    
    steps.push(accessibilityLoc.stepConcourse);
    steps.push(accessibilityLoc.stepTurn);
    
    if (accessible) {
      steps.push(accessibilityLoc.stepWheelchair);
    } else {
      steps.push(accessibilityLoc.stepRamp);
    }
    steps.push(accessibilityLoc.stepSeat);

    let ecoTip = "Keep the planet green! Use public transit platforms near Gate B East for 0-emission egress.";
    if (preference === 'green') {
      ecoTip = "Eco-routing active: Pass by Concourse B recycling node to receive double Green points!";
    }

    return { time, distance, steps, ecoTip };
  }

  function gateLocales() {
    const locs = {
      en: { detourGateA: "Detour active: Turnstile WAN outages detected at Gate A. Rerouting via Gate B concourse corridor." },
      es: { detourGateA: "Desvío activo: Caídas de red WAN en Puerta A. Desviando por pasillo de Puerta B." },
      pt: { detourGateA: "Desvio ativo: Queda de rede no Portão A. Roteando pelo corredor do Portão B." },
      de: { detourGateA: "Umleitung aktiv: Netzwerkfehler an Tor A. Umleitung über Tor B Gang." },
      fr: { detourGateA: "Déviation active : Panne réseau à la Porte A. Redirection via le couloir de la Porte B." },
      ar: { detourGateA: "تحويل مسار نشط: انقطاع شبكة البوابة A. إعادة توجيه عبر ممر البوابة B." },
      ja: { detourGateA: "迂回ルート案内：ゲートAのシステム障害のため、ゲートBコンコース経由で案内します。" }
    };
    return locs[currentLanguage] || locs['en'];
  }

  // --- GREEN PLAY SUSTAINABILITY TRACKER ---
  btnCalculateEco.addEventListener('click', () => {
    playRetroSound('beep');
    const selectedOption = selectTransitMode.options[selectTransitMode.selectedIndex];
    const pointsToAdd = parseInt(selectedOption.getAttribute('data-points')) || 0;
    const co2Saved = parseFloat(selectedOption.getAttribute('data-co2')) || 0;

    totalEcoPoints += pointsToAdd;
    
    if (greenScoreStat) {
      const valEl = greenScoreStat.querySelector('.fan-stat-val');
      if (valEl) valEl.textContent = `${totalEcoPoints} pts`;
    }
    const valCircle = document.querySelector('.eco-circle-value');
    if (valCircle) valCircle.textContent = totalEcoPoints;

    alert(`Success: logged travel! Earned +${pointsToAdd} Eco Points. Total: ${totalEcoPoints} pts.`);

    if (totalEcoPoints >= 200) {
      const tierEl = document.querySelector('.eco-stat-details h3');
      if (tierEl) tierEl.textContent = "Carbon Saver Tier: Platinum Champion";
    }

    playRetroSound('success');
    speakAI(chatbotLocales[currentLanguage].ecoSuccess, currentLanguage);
  });

  btnNewEcoTip.addEventListener('click', () => {
    playRetroSound('beep');
    const tip = dynamicEcoTips[Math.floor(Math.random() * dynamicEcoTips.length)];
    ecoTipBox.textContent = `"${tip}"`;
    playRetroSound('success');
    speakAI(tip, currentLanguage);
  });

  // --- ACCESSIBILITY MODE TOGGLE ---
  btnAccessibilityMode.addEventListener('click', () => {
    playRetroSound('beep');
    document.body.classList.toggle('accessibility-mode');
    if (document.body.classList.contains('accessibility-mode')) {
      btnAccessibilityMode.setAttribute('aria-pressed', 'true');
      btnAccessibilityMode.innerHTML = '';
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'eye');
      btnAccessibilityMode.appendChild(icon);
      btnAccessibilityMode.appendChild(document.createTextNode(' Normal Contrast'));
      clearRoutePath();
      speakAI("Accessibility mode enabled. Large text and high contrast borders loaded. CRT overlay effects and sound alarms deactivated.", 'en');
      announceSR("Accessibility high contrast mode activated. Layout animations and CRT screen effects have been disabled.");
    } else {
      btnAccessibilityMode.setAttribute('aria-pressed', 'false');
      btnAccessibilityMode.innerHTML = '';
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'accessibility');
      btnAccessibilityMode.appendChild(icon);
      btnAccessibilityMode.appendChild(document.createTextNode(' Accessibility Mode'));
      speakAI("Returned to standard interface layout.", 'en');
      announceSR("Accessibility high contrast mode deactivated.");
    }
    lucide.createIcons();
  });

  // --- FLOATING CHATBOT WIDGET CONTROLLERS ---
  btnChatbotToggle.addEventListener('click', () => {
    playRetroSound('beep');
    if (chatbotWindow.style.display === 'none') {
      chatbotWindow.style.display = 'flex';
      btnChatbotToggle.setAttribute('aria-expanded', 'true');
      btnChatbotToggle.innerHTML = '';
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'x');
      btnChatbotToggle.appendChild(icon);
      btnChatbotToggle.appendChild(document.createTextNode(' Close Chat'));
      lucide.createIcons();
      chatbotInputFloat.focus();
      announceSR("AI Concierge chatbot window opened. Focus shifted to chatbot input field.");
    } else {
      chatbotWindow.style.display = 'none';
      btnChatbotToggle.setAttribute('aria-expanded', 'false');
      btnChatbotToggle.innerHTML = '';
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'sparkles');
      btnChatbotToggle.appendChild(icon);
      btnChatbotToggle.appendChild(document.createTextNode(' AI Concierge'));
      lucide.createIcons();
      announceSR("AI Concierge chatbot window closed.");
    }
  });

  btnChatbotClose.addEventListener('click', () => {
    playRetroSound('beep');
    chatbotWindow.style.display = 'none';
    btnChatbotToggle.setAttribute('aria-expanded', 'false');
    btnChatbotToggle.innerHTML = '';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'sparkles');
    btnChatbotToggle.appendChild(icon);
    btnChatbotToggle.appendChild(document.createTextNode(' AI Concierge'));
    lucide.createIcons();
    btnChatbotToggle.focus();
    announceSR("AI Concierge chatbot window closed. Focus returned to chat toggle button.");
  });

  langButtonsFloat.forEach(btn => {
    btn.addEventListener('click', () => {
      playRetroSound('beep');
      langButtonsFloat.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLanguage = btn.getAttribute('data-lang');
      
      chatbotMessagesFloatLog.innerHTML = `
        <div class="chat-bubble ai-bubble">
          <div class="chat-bubble-avatar"><i data-lucide="cpu"></i></div>
          <div class="chat-bubble-text"></div>
        </div>
      `;
      chatbotMessagesFloatLog.querySelector('.chat-bubble-text').textContent = chatbotLocales[currentLanguage].welcome;
      lucide.createIcons();
    });
  });

  btnChatbotSendFloat.addEventListener('click', () => {
    playRetroSound('beep');
    submitFloatUserQuery();
  });

  chatbotInputFloat.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      playRetroSound('beep');
      submitFloatUserQuery();
    }
  });

  async function submitFloatUserQuery() {
    let query = chatbotInputFloat.value.trim();
    if (!query) return;

    if (query.length > 1000) {
      query = query.substring(0, 1000);
    }

    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user-bubble';
    userBubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="user"></i></div>
      <div class="chat-bubble-text"></div>
    `;
    userBubble.querySelector('.chat-bubble-text').textContent = query;
    chatbotMessagesFloatLog.appendChild(userBubble);
    chatbotInputFloat.value = '';
    chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
    lucide.createIcons();

    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai-bubble typing-bubble';
    typingBubble.innerHTML = `
      <div class="chat-bubble-avatar"><i data-lucide="cpu"></i></div>
      <div class="chat-bubble-text">
        <div class="ai-spinner-container">
          <span class="ai-spinner-icon"><i data-lucide="refresh-cw"></i></span>
          <span>[AI COGNITIVE CORE ANALYZING USER QUERY...]</span>
        </div>
      </div>
    `;
    chatbotMessagesFloatLog.appendChild(typingBubble);
    chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
    lucide.createIcons();

    const systemPrompt = `You are Vanguard Arena AI, the official tournament concierge for the FIFA World Cup 2026 at MetLife Stadium.
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
    
    Respond to the user's question directly in the requested language: "${currentLanguage}".
    Keep your answers clear, professional, and very concise (maximum of 3 sentences or a short bulleted list), unless they ask for specific complex directions. Make sure you use markdown bolding (e.g., **Gate B**) where appropriate. Do not output code blocks.`;

    let reply = "";
    try {
      reply = await queryGemini(systemPrompt, query);
    } catch (err) {
      console.warn("Gemini API call failed for float chat. Using local fallback.", err);
      reply = generateGenAIResponse(query);
      await new Promise(r => setTimeout(r, 800));
    }

    typingBubble.remove();

    const score = (98.0 + Math.random() * 1.9).toFixed(1);
    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai-bubble';
    aiBubble.innerHTML = `
      <div class="chat-bubble-avatar">
        <i data-lucide="cpu"></i>
        <div class="ai-confidence-badge">CONF: ${score}%</div>
      </div>
      <div class="chat-bubble-text"></div>
    `;
    aiBubble.querySelector('.chat-bubble-text').innerHTML = formatChatText(reply);
    chatbotMessagesFloatLog.appendChild(aiBubble);
    chatbotMessagesFloatLog.scrollTop = chatbotMessagesFloatLog.scrollHeight;
    lucide.createIcons();

    speakAI(reply.replace(/\*\*|\*/g, ''), currentLanguage);
  }

  // --- GEMINI COGNITIVE MODEL & CROWD PREDICTIONS HUB ---
  btnRunPredictions.addEventListener('click', async () => {
    playRetroSound('beep');
    predictionsLoader.style.display = 'block';
    predictionsOutputContainer.style.display = 'none';
    predictionsProgressFill.style.width = '0%';
    
    let width = 0;
    const interval = setInterval(() => {
      width += Math.floor(Math.random() * 15) + 6;
      if (width >= 100) {
        width = 100;
        clearInterval(interval);
      }
      predictionsProgressFill.style.width = `${width}%`;
    }, 80);

    const systemPrompt = `You are the Vanguard Arena AI Cognitive Engine.
    Compile a stadium operations predictive report for the FIFA World Cup 2026.
    Use current telemetry conditions to formulate recommendations.
    Current Stadium Telemetry:
    - Gate A: heavily congested (22m wait, scanners offline).
    - Gate B: normal flow (4m wait).
    - Gate C: moderate (11m wait).
    - Gate D: moderate (8m wait).
    - Sector 104 restroom: 15m wait. Sector 102/103 restrooms: 2m wait.
    - Concession Sector 104: 18m wait. Concession Sector 105: 8m wait.
    - Match: USA vs England (Score 2-1, 76 mins, crowd density high).
    - Weather: Wind gusting 15mph, light rain forecast, roof open.
    
    Your report must contain:
    1. **Rerouting Directive**: Clear, actionable rerouting of incoming gate traffic (recommending Gate B/D detours).
    2. **Optimal Concessions/Facilities**: Points fans towards under-utilized concessions and restrooms (e.g. Sector 102/103 to avoid Sector 104 restroom bottleneck).
    3. **Crowd Density Predictions**: Predicts restroom, gate, and transit bottleneck flows for the next 30 minutes (post-match egress).
    
    Format your output in raw HTML containing ONLY <h4> heading starting with "GenAI Operations Strategy" and a <ul> list containing several <li> items.
    Do NOT wrap output in markdown blocks like \`\`\`html. Keep it highly tactical, professional, and very concise.`;

    const userPrompt = "Generate real-time crowd forecasts, optimal gates, and concession load predictions.";

    let predictionHtml = "";
    try {
      predictionHtml = await queryGemini(systemPrompt, userPrompt);
    } catch (err) {
      console.warn("Gemini predictions call failed. Simulating local analytical model.", err);
      predictionHtml = simulateLocalPredictions();
    }

    setTimeout(() => {
      clearInterval(interval);
      predictionsProgressFill.style.width = '100%';
      
      setTimeout(() => {
        predictionsLoader.style.display = 'none';
        predictionsOutputContainer.style.display = 'block';
        predictionsAiContent.innerHTML = '';
        predictionsAiContent.appendChild(sanitizeHTML(predictionHtml));
        playRetroSound('success');
        speakAI("AI crowd prediction and gate recommendation completed.", currentLanguage);
        appendLiveEvent('system', "Gemini operational crowd analysis loaded successfully.");
      }, 150);
    }, 1000);
  });

  function simulateLocalPredictions() {
    return `<h4>GenAI Operations Strategy Recommendation</h4>
<ul>
  <li><strong>Optimal Gate Recommendation:</strong> Direct all incoming pedestrian corridors to <strong>Gate B (East)</strong> (4m wait) and <strong>Gate D (West)</strong> (8m wait). Staggered Gate A closures should continue.</li>
  <li><strong>AI Decision Explanation:</strong> Redirection spreads the 82,300 crowd across low-wait entryways, avoiding choke points at offline scanning turnstiles.</li>
  <li><strong>Measurable Outcome:</strong> Average ingress throughput increases by **420 fans/minute**, reducing total stadium filling time by **18 minutes**.</li>
  <li><strong>Concessions & Facilities Rerouting:</strong> Alert fans in Sector 104 to proceed to <strong>Sector 102/103 restrooms</strong> (2m wait vs 15m at 104) and Sector 105 concessions (10 mins saved).</li>
  <li><strong>Egress Surge Forecast (Next 30m):</strong> Post-match egress will peak at <strong>90+5' (approx. 18 minutes from now)</strong>. Recommending bus lot shuttle activation to buffer NJ Transit queue backlogs.</li>
</ul>`;
  }

  // --- FAN NAVIGATION TAB BAR SWITCHER ---
  const tabButtons = [
    { btn: tabBtnAssistant, content: fanTabAssistant, name: 'assistant' },
    { btn: tabBtnNavigation, content: fanTabNavigation, name: 'navigation' },
    { btn: tabBtnSustainability, content: fanTabSustainability, name: 'sustainability' },
    { btn: tabBtnPredictions, content: fanTabPredictions, name: 'predictions' }
  ];

  tabButtons.forEach(tab => {
    tab.btn.addEventListener('click', () => {
      playRetroSound('beep');
      tabButtons.forEach(t => {
        t.btn.classList.remove('active');
        t.btn.setAttribute('aria-selected', 'false');
        t.content.style.display = 'none';
      });
      tab.btn.classList.add('active');
      tab.btn.setAttribute('aria-selected', 'true');
      tab.content.style.display = 'block';
      activeTab = tab.name;
      
      announceSR(`Switched to ${tab.btn.textContent.trim()} tab.`);
      
      if (activeTab === 'assistant') {
        clearChatLog();
        appendChatBubble('ai', chatbotLocales[currentLanguage].welcome);
      }
    });
  });

  // --- EXPOSE OPERATIONS INTERFACE FOR TESTING ---
  window.VanguardOps = {
    gateCoords,
    sectorCoords,
    simulateLocalPredictions,
    playRetroSound,
    appendLiveEvent,
    showToast,
    drawRoutePath,
    clearRoutePath
  };
});
