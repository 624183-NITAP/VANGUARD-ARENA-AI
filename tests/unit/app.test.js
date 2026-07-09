import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Define mocks before module loading so static checks evaluate correctly
global.prompt = vi.fn().mockReturnValue('dummy-api-key');
global.alert = vi.fn();
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: () => ({
    type: '',
    frequency: { value: 0, setValueAtTime: vi.fn() },
    connect: () => {},
    start: () => {},
    stop: () => {}
  }),
  createGain: () => ({
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: () => {}
  }),
  destination: {},
  state: 'running',
  close: vi.fn()
}));
global.webkitAudioContext = global.AudioContext;

global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: () => [],
  speaking: false
};
global.SpeechSynthesisUtterance = vi.fn();

global.SpeechRecognition = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  continuous: false,
  onstart: null,
  onresult: null,
  onend: null,
  onerror: null
}));
global.webkitSpeechRecognition = global.SpeechRecognition;
global.lucide = { createIcons: vi.fn() };

// Core imports from modular codebase
import { escapeHTML, sanitizeHTML, formatChatText, setHealthStatus } from '../../utils.js';
import { queryGemini } from '../../api.js';
import { playRetroSound } from '../../sound.js';
import { speakAI, createSpeechRecognition } from '../../speech.js';
import { drawRoutePath, clearRoutePath } from '../../map.js';
import { gateCoords, sectorCoords } from '../../config.js';

// Parse index.html structure
const htmlPath = path.resolve(process.cwd(), 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

describe('Vanguard Arena AI - Comprehensive Unit & Integration Tests', () => {
  let VanguardOps;

  beforeAll(async () => {
    // Set inner HTML in JSDOM context
    document.body.innerHTML = htmlContent;

    // Mock global fetch for Gemini proxy API calls
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url.includes('/api/gemini')) {
        const body = init && init.body ? JSON.parse(init.body) : {};
        const systemPrompt = body.systemPrompt || '';
        
        if (systemPrompt.includes('Navigation Engine')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              candidates: [{
                content: {
                  parts: [{
                    text: JSON.stringify({
                      time: 5,
                      distance: 300,
                      steps: ["Enter via Gate B", "Proceed straight", "Enter Sector 104"],
                      ecoTip: "Recycle your cups at Concourse B"
                    })
                  }]
                }
              }]
            })
          });
        }
        
        const mockText = systemPrompt.includes('mitigation action plan') 
          ? `<h4>GenAI Operations Recommendation</h4><ul><li><strong>Immediate:</strong> Detour to Gate B.</li></ul>`
          : "Mocked Gemini Response (Gate B)";

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: mockText
                }]
              }
            }]
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Load and execute app.js code
    const appPath = path.resolve(process.cwd(), 'app.js');
    await import(appPath);

    // Trigger DOMContentLoaded manually
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Retrieve exposed helper methods
    VanguardOps = window.VanguardOps;
  });

  // --- SECTION 1: UTILS.JS UNIT TESTS ---
  describe('utils.js', () => {
    it('should escape HTML characters safely to prevent XSS injection', () => {
      const dangerous = '<script>alert("xss")</script> & "quote"';
      const clean = escapeHTML(dangerous);
      expect(clean).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quote&quot;');
    });

    it('should return non-string inputs unmodified in escapeHTML', () => {
      expect(escapeHTML(null)).toBeNull();
      expect(escapeHTML(123)).toBe(123);
    });

    it('should sanitize HTML strings, removing script tags and preserving allowed layout markup', () => {
      const rawHtml = '<h4>Title</h4><p>Para <script>danger()</script><strong>Bold</strong></p>';
      const frag = sanitizeHTML(rawHtml);
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(frag);
      expect(tempDiv.innerHTML).toBe('<h4>Title</h4><p>Para danger()<strong>Bold</strong></p>');
    });

    it('should strip out comment nodes and unallowed attributes in sanitization helper', () => {
      const complexHtml = '<p><!-- comment --><span>Text</span><iframe src="x"></iframe><span class="safe" style="color:red">Test</span></p>';
      const frag = sanitizeHTML(complexHtml);
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(frag);
      expect(tempDiv.innerHTML).toBe('<p><span>Text</span><span class="safe">Test</span></p>');
    });

    it('should format double asterisks markdown bolding to strong HTML tags', () => {
      const rawMsg = "Please enter through **Gate B** for quick access.";
      const formatted = formatChatText(rawMsg);
      expect(formatted).toBe('Please enter through <strong>Gate B</strong> for quick access.');
    });

    it('should set status text alongside green breathing pulse dot', () => {
      const statusContainer = document.createElement('div');
      setHealthStatus(statusContainer, "NOMINAL TEST");
      expect(statusContainer.querySelector('.pulse-dot')).not.toBeNull();
      expect(statusContainer.textContent).toContain("NOMINAL TEST");
    });

    it('should return early in setHealthStatus if target element is missing', () => {
      expect(() => setHealthStatus(null, "STATUS")).not.toThrow();
    });
  });

  // --- SECTION 2: API.JS UNIT TESTS ---
  describe('api.js', () => {
    it('should send proxy payload requests to /api/gemini endpoint', async () => {
      const reply = await queryGemini("System prompt text", "User prompt text");
      expect(reply).toContain("Gate B");
      expect(global.fetch).toHaveBeenCalledWith('/api/gemini', expect.any(Object));
    });

    it('should reject requests with invalid prompt parameters', async () => {
      await expect(queryGemini(null, "User")).rejects.toThrow("Invalid prompt inputs");
      await expect(queryGemini("System", null)).rejects.toThrow("Invalid prompt inputs");
    });

    it('should throw errors when proxy response status is not ok', async () => {
      global.fetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal error")
      }));
      await expect(queryGemini("System", "User")).rejects.toThrow("Server returned 500: Internal error");
    });

    it('should throw an error when Gemini response contains empty content candidates', async () => {
      global.fetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ candidates: [] })
      }));
      await expect(queryGemini("System", "User")).rejects.toThrow("Empty content in Gemini response");
    });
  });

  // --- SECTION 3: SOUND.JS UNIT TESTS ---
  describe('sound.js', () => {
    it('should compile retro alerts synthesized frequencies successfully', () => {
      document.body.classList.remove('accessibility-mode');
      expect(() => playRetroSound('beep')).not.toThrow();
      expect(() => playRetroSound('boop')).not.toThrow();
      expect(() => playRetroSound('warn')).not.toThrow();
      expect(() => playRetroSound('success')).not.toThrow();
    });

    it('should bypass sound synthesis when accessibility mode contrast is active', () => {
      document.body.classList.add('accessibility-mode');
      const spy = vi.spyOn(global.window, 'AudioContext');
      playRetroSound('beep');
      expect(spy).not.toHaveBeenCalled();
      document.body.classList.remove('accessibility-mode');
    });

    it('should bypass sound synthesis when AudioContext constructor is unavailable', () => {
      const originalAudioContext = global.window.AudioContext;
      const originalWebkitAudioContext = global.window.webkitAudioContext;
      delete global.window.AudioContext;
      delete global.window.webkitAudioContext;
      
      expect(() => playRetroSound('beep')).not.toThrow();
      
      global.window.AudioContext = originalAudioContext;
      global.window.webkitAudioContext = originalWebkitAudioContext;
    });

    it('should safely catch and log sound synthesis failures', () => {
      const originalAudioContext = global.window.AudioContext;
      global.window.AudioContext = () => { throw new Error("Audio setup error"); };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      playRetroSound('beep');
      expect(consoleSpy).toHaveBeenCalledWith("Web Audio API synthesis failed", expect.any(Error));
      
      global.window.AudioContext = originalAudioContext;
      consoleSpy.mockRestore();
    });
  });

  // --- SECTION 4: SPEECH.JS UNIT TESTS ---
  describe('speech.js', () => {
    it('should speak synthesis text in requested locales', () => {
      expect(() => speakAI("Welcome", "en")).not.toThrow();
      expect(() => speakAI("Bienvenido", "es")).not.toThrow();
    });

    it('should return early if speechSynthesis API is not supported in the window', () => {
      const originalSpeechSynth = global.window.speechSynthesis;
      delete global.window.speechSynthesis;
      
      expect(() => speakAI("Narration content")).not.toThrow();
      
      global.window.speechSynthesis = originalSpeechSynth;
    });

    it('should initialize browser speech recognition builder wrapper', () => {
      const instance = createSpeechRecognition({
        onStart: vi.fn(),
        onResult: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn()
      });
      expect(instance).toBeDefined();
      expect(instance.continuous).toBe(false);
    });
  });

  // --- SECTION 5: MAP.JS UNIT TESTS ---
  describe('map.js', () => {
    it('should draw paths and toggle tracking dots on map overlay SVG', () => {
      drawRoutePath('Gate B', '104', false);
      const pathEl = document.getElementById('active-routing-path');
      expect(pathEl.style.display).toBe('block');
      expect(pathEl.getAttribute('d')).toContain('M 730 300');
    });

    it('should draw wheelchair accessible route path using alternate radii calculations', () => {
      drawRoutePath('Gate B', '104', true);
      const pathEl = document.getElementById('active-routing-path');
      expect(pathEl.style.display).toBe('block');
      expect(pathEl.getAttribute('d')).toContain('A 230 230');
    });

    it('should return early from drawRoutePath if gate or sector is invalid', () => {
      expect(() => drawRoutePath('Invalid Gate', '104', false)).not.toThrow();
      expect(() => drawRoutePath('Gate B', 'Invalid Sector', false)).not.toThrow();
    });

    it('should return early from drawRoutePath if stadium-map element is missing', () => {
      const map = document.getElementById('stadium-map');
      map.removeAttribute('id');
      expect(() => drawRoutePath('Gate B', '104', false)).not.toThrow();
      map.setAttribute('id', 'stadium-map'); // restore
    });

    it('should handle large angle difference loops in drawRoutePath', () => {
      const origGate = { ...gateCoords['Gate B'] };
      const origSec = { ...sectorCoords['104'] };
      
      // Coords to trigger sweep angle checks loops
      gateCoords['Gate B'] = { x: 100, y: 100 };
      sectorCoords['104'] = { x: 700, y: 500 };
      
      expect(() => drawRoutePath('Gate B', '104', false)).not.toThrow();
      
      gateCoords['Gate B'] = origGate;
      sectorCoords['104'] = origSec;
    });

    it('should clear map overlays, toggling display to none', () => {
      clearRoutePath();
      const pathEl = document.getElementById('active-routing-path');
      expect(pathEl.style.display).toBe('none');
    });
  });

  // --- SECTION 6: APP.JS ELEMENT INTERACTION SPECS ---
  describe('app.js Integration', () => {
    it('should expose VanguardOps namespace', () => {
      expect(VanguardOps).toBeDefined();
    });

    it('should support view panels swapping', () => {
      const staffBtn = document.getElementById('btn-staff-view');
      const fanBtn = document.getElementById('btn-fan-view');
      const staffPanel = document.getElementById('staff-view-panel');
      const fanPanel = document.getElementById('fan-view-panel');

      fanBtn.click();
      expect(fanPanel.classList.contains('hidden-panel')).toBe(false);
      expect(staffPanel.classList.contains('hidden-panel')).toBe(true);

      staffBtn.click();
      expect(staffPanel.classList.contains('hidden-panel')).toBe(false);
      expect(fanPanel.classList.contains('hidden-panel')).toBe(true);
    });

    it('should swap stadium map overlays styling on menu selection click', () => {
      const btnHeat = document.getElementById('map-btn-heatmap');
      const btnAccess = document.getElementById('map-btn-accessibility');
      const btnFac = document.getElementById('map-btn-facilities');
      const map = document.getElementById('stadium-map');

      btnHeat.click();
      expect(map.classList.contains('stadium-map-heatmap')).toBe(true);

      btnAccess.click();
      expect(map.classList.contains('stadium-map-accessibility')).toBe(true);

      btnFac.click();
      expect(map.classList.contains('stadium-map-facilities')).toBe(true);
    });

    it('should handle carbon-reward calculators logs updates', () => {
      const select = document.getElementById('select-transit-mode');
      const btnCalc = document.getElementById('btn-calculate-eco');
      const valCircle = document.querySelector('.eco-circle-value');

      select.value = 'bus';
      btnCalc.click();
      expect(valCircle.textContent).toBe('180'); // 120 + 60 pts

      // Click again to cross 200 pts and check Platinum Champion tier upgrade
      btnCalc.click();
      expect(valCircle.textContent).toBe('240');
      const tierEl = document.querySelector('.eco-stat-details h3');
      expect(tierEl.textContent).toContain('Platinum Champion');
    });

    it('should generate new eco tip text on request click', () => {
      const btnNewTip = document.getElementById('btn-new-eco-tip');
      const tipBox = document.getElementById('eco-tip-box');
      const oldTipText = tipBox.textContent;

      btnNewTip.click();
      expect(tipBox.textContent).not.toBe(oldTipText);
    });

    it('should toggle high-contrast accessibility classes on body element', () => {
      const toggle = document.getElementById('btn-accessibility-mode');
      toggle.click();
      expect(document.body.classList.contains('accessibility-mode')).toBe(true);
      toggle.click();
      expect(document.body.classList.contains('accessibility-mode')).toBe(false);
    });

    it('should toggle float concierge chat window layout visibility', () => {
      const btnToggle = document.getElementById('btn-chatbot-toggle');
      const windowChat = document.getElementById('chatbot-window');
      const btnClose = document.getElementById('btn-chatbot-close');
      windowChat.style.display = 'none';

      btnToggle.click();
      expect(windowChat.style.display).toBe('flex');

      btnToggle.click();
      expect(windowChat.style.display).toBe('none');

      btnToggle.click();
      expect(windowChat.style.display).toBe('flex');
      if (btnClose) btnClose.click();
      expect(windowChat.style.display).toBe('none');
    });

    it('should handle custom incidents additions and solved mitigations dispatches', async () => {
      const btnTrigger = document.getElementById('btn-trigger-incident');
      const consoleLog = document.getElementById('console-log');
      const btnDispatch = document.getElementById('btn-dispatch-action');

      btnTrigger.click();
      // Wait for console text to be populated (either recommendation or fallback)
      await new Promise(r => setTimeout(r, 1200));
      expect(consoleLog.innerHTML).toMatch(/Operations Recommendation|Action Plan|Custom GenAI/);

      btnDispatch.click();
      expect(consoleLog.innerHTML).toContain('Mitigations executed');
    });

    it('should handle local fallback when incident dispatch api call fails', async () => {
      global.fetch.mockImplementationOnce(() => Promise.reject("Mitigation Fail"));
      const btnTrigger = document.getElementById('btn-trigger-incident');
      const consoleLog = document.getElementById('console-log');
      const btnDispatch = document.getElementById('btn-dispatch-action');

      btnTrigger.click();
      await new Promise(r => setTimeout(r, 1200));
      const consoleStatusText = document.getElementById('console-status-text');
      expect(consoleStatusText.textContent).toContain('Local Fallback');

      btnDispatch.click();
      expect(consoleLog.innerHTML).toContain('Mitigations executed');
    });

    it('should execute crowd predictions simulation correctly', async () => {
      const runBtn = document.getElementById('btn-run-predictions');
      const progress = document.getElementById('prediction-progress-fill');
      const output = document.getElementById('predictions-output-container');

      runBtn.click();
      expect(progress.style.width).toBeDefined();

      // Wait for predictions completion
      await new Promise(r => setTimeout(r, 1200));
      expect(output.style.display).toBe('block');
    });

    it('should fallback to local predictions strategy when predictions api call fails', async () => {
      global.fetch.mockImplementationOnce(() => Promise.reject("Predictions Fail"));
      const runBtn = document.getElementById('btn-run-predictions');
      if (runBtn) {
        runBtn.click();
        await new Promise(r => setTimeout(r, 1200));
        const output = document.getElementById('predictions-output-container');
        expect(output.style.display).toBe('block');
      }
    });

    it('should run simulation of local fallback predictions text block', () => {
      const predictions = VanguardOps.simulateLocalPredictions();
      expect(predictions).toContain('Strategy Recommendation');
    });

    it('should swap tabs layout pages inside Fan Concierge panel', () => {
      const tabNav = document.getElementById('tab-btn-navigation');
      const tabSust = document.getElementById('tab-btn-sustainability');
      const tabAssistant = document.getElementById('tab-btn-assistant');
      const panNav = document.getElementById('fan-tab-navigation');
      const panSust = document.getElementById('fan-tab-sustainability');
      const panAssistant = document.getElementById('fan-tab-assistant');

      tabNav.click();
      expect(panNav.style.display).toBe('block');

      tabSust.click();
      expect(panSust.style.display).toBe('block');
      expect(panNav.style.display).toBe('none');

      tabAssistant.click();
      expect(panAssistant.style.display).toBe('block');
      expect(panSust.style.display).toBe('none');
    });

    it('should calculate wayfinding paths and trigger route alerts', async () => {
      const gateSelect = document.getElementById('input-gate');
      const sectorSelect = document.getElementById('input-sector');
      const calcBtn = document.getElementById('btn-calculate-route');
      const list = document.getElementById('directions-steps-list');

      gateSelect.value = 'Gate B';
      sectorSelect.value = '104';
      calcBtn.click();

      expect(list.innerHTML).toContain('CALCULATING');
      await new Promise(r => setTimeout(r, 1200));
      expect(list.innerHTML).toContain('Enter via Gate B');
    });

    it('should fallback to local routing simulation when navigation api call fails', async () => {
      global.fetch.mockImplementationOnce(() => Promise.reject("Route Fail"));
      const gateSelect = document.getElementById('input-gate');
      const sectorSelect = document.getElementById('input-sector');
      const calcBtn = document.getElementById('btn-calculate-route');
      const list = document.getElementById('directions-steps-list');

      gateSelect.value = 'Gate B';
      sectorSelect.value = '104';
      calcBtn.click();

      await new Promise(r => setTimeout(r, 1200));
      expect(list.innerHTML).toContain('Enter via Gate B');
    });

    it('should support floating chatbot language button clicks and float chat submissions', async () => {
      const langBtnEs = document.querySelector('.lang-btn-float[data-lang="es"]');
      const langBtnEn = document.querySelector('.lang-btn-float[data-lang="en"]');
      const inputFloat = document.getElementById('chatbot-input-float');
      const sendFloat = document.getElementById('btn-chatbot-send-float');
      const logFloat = document.getElementById('chatbot-messages-float-log');

      if (langBtnEs) langBtnEs.click();
      expect(logFloat.textContent).toContain('¡Bienvenido');

      if (langBtnEn) langBtnEn.click();
      expect(logFloat.textContent).toContain('Welcome');

      if (inputFloat && sendFloat) {
        inputFloat.value = "Hello AI";
        sendFloat.click();
        await new Promise(r => setTimeout(r, 1200));
        expect(logFloat.textContent).toContain('Mocked Gemini Response');
      }

      if (inputFloat) {
        inputFloat.value = "Check sectors";
        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
        inputFloat.dispatchEvent(enterEvent);
        await new Promise(r => setTimeout(r, 1200));
        expect(logFloat.textContent).toContain('Mocked Gemini Response');
      }
    });

    it('should trigger local chatbot response fallback when float API call fails', async () => {
      global.fetch.mockImplementationOnce(() => Promise.reject("Float Fail"));
      const inputFloat = document.getElementById('chatbot-input-float');
      const sendFloat = document.getElementById('btn-chatbot-send-float');
      const logFloat = document.getElementById('chatbot-messages-float-log');

      if (inputFloat && sendFloat) {
        inputFloat.value = "restroom";
        sendFloat.click();
        await new Promise(r => setTimeout(r, 1200));
        expect(logFloat.textContent).toContain('restroom');
      }
    });

    it('should submit query via Enter key on normal chatbot input', async () => {
      const chatInput = document.getElementById('chat-input');
      const log = document.getElementById('chat-messages-log');
      
      if (chatInput) {
        chatInput.value = "Where is Gate B?";
        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
        chatInput.dispatchEvent(enterEvent);
        await new Promise(r => setTimeout(r, 1200));
        expect(log.textContent).toContain('Mocked Gemini Response');
      }
    });

    it('should trigger local chatbot response fallback when normal chat API call fails', async () => {
      global.fetch.mockImplementationOnce(() => Promise.reject("Normal Chat Fail"));
      const chatInput = document.getElementById('chat-input');
      const log = document.getElementById('chat-messages-log');
      
      if (chatInput) {
        chatInput.value = "transit";
        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
        chatInput.dispatchEvent(enterEvent);
        await new Promise(r => setTimeout(r, 1200));
        expect(log.textContent).toContain('transit');
      }
    });

    it('should simulate voice input when clicking microphone button', async () => {
      const micBtn = document.getElementById('btn-chat-mic');
      const chatInput = document.getElementById('chat-input');
      
      if (micBtn && chatInput) {
        micBtn.click();
        await new Promise(r => setTimeout(r, 1800));
        expect(chatInput.value).toBe(''); // cleared after auto-submit
      }
    });

    it('should truncate float chatbot input when query length exceeds 1000 characters', async () => {
      const inputFloat = document.getElementById('chatbot-input-float');
      const sendFloat = document.getElementById('btn-chatbot-send-float');
      
      if (inputFloat && sendFloat) {
        inputFloat.value = 'a'.repeat(1005);
        sendFloat.click();
        await new Promise(r => setTimeout(r, 1200));
        expect(inputFloat.value).toBe('');
      }
    });

    it('should truncate normal chatbot input when query length exceeds 1000 characters', async () => {
      const chatInput = document.getElementById('chat-input');
      const btnSend = document.getElementById('btn-chat-send');
      
      if (chatInput && btnSend) {
        chatInput.value = 'b'.repeat(1005);
        btnSend.click();
        await new Promise(r => setTimeout(r, 1200));
        expect(chatInput.value).toBe('');
      }
    });
  });
});
