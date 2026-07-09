/**
 * Telemetry Manager — Handles live sensor updates and the Event Feed buffer.
 *
 * Architecture notes:
 * - Extends EventTarget so future WebSocket/MQTT bridges can dispatch
 *   'telemetryPacket' CustomEvents without changing consumer code.
 * - DOM references for health bar elements are cached once on init() to
 *   prevent repeated getElementById calls during the update loop.
 * - The heatmap breathing animation respects prefers-reduced-motion.
 * - The live event feed enforces a MAX_LIVE_EVENTS ceiling to prevent
 *   unbounded DOM growth and layout thrashing.
 */
"use strict";

import { setHealthStatus } from './utils.js';
import { showToast, formatTime } from './helpers.js';
import { playRetroSound } from './sound.js';
import {
  TELEMETRY_UPDATE_INTERVAL_MS,
  BREATHING_INTERVAL_MS,
  MAX_LIVE_EVENTS
} from './constants.js';

// ---------------------------------------------------------------------------
// TelemetryManager Class
// ---------------------------------------------------------------------------

/**
 * Singleton telemetry coordinator. Drives health bar updates via an internal
 * simulation loop that mirrors what a real MQTT/WebSocket stream would push.
 * Each simulated packet fires a 'telemetryPacket' CustomEvent that the
 * internal listener applies to the DOM — the same path a real packet would use.
 */
class TelemetryManager extends EventTarget {
  constructor() {
    super();
    /** @type {Object|null} Reference to the shared AppState object. */
    this.state = null;

    /**
     * Cached DOM references for health bar elements.
     * Populated once during init() to avoid repeated getElementById calls.
     * @type {Record<string, HTMLElement|null>}
     */
    this._healthEls = {};

    /**
     * Cached NodeList of SVG sector elements for the breathing animation.
     * Re-queried lazily when the stadium map is first needed.
     * @type {NodeListOf<Element>|null}
     */
    this._sectors = null;

    /**
     * Whether the user's OS has requested reduced motion.
     * Checked once at construction time using matchMedia.
     * @type {boolean}
     */
    this._prefersReducedMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }

  /**
   * Initializes the telemetry system with shared state and starts simulation loops.
   *
   * @param {Object} state Centralized AppState reference.
   */
  init(state) {
    this.state = state;
    this._cacheHealthElements();
    this._registerPacketListener();
    this._startBreathingLoop();
    this._startSimulationLoop();
  }

  /**
   * Caches references to all health bar DOM elements in a lookup map.
   * Called once during init() to avoid repeated getElementById queries.
   * @private
   */
  _cacheHealthElements() {
    const ids = ['health-ai', 'health-iot', 'health-cctv', 'health-weather', 'health-network'];
    for (const id of ids) {
      this._healthEls[id] = document.getElementById(id);
    }
  }

  /**
   * Registers the internal listener that applies telemetry packets to the DOM.
   * This is the same code path that a live WebSocket message would call.
   * @private
   */
  _registerPacketListener() {
    this.addEventListener('telemetryPacket', (e) => {
      const { key, value, status } = e.detail;

      if (this.state) {
        this.state.telemetry[key] = value;
      }

      const elIdMap = {
        aiCognition:      'health-ai',
        iotActiveSensors: 'health-iot',
        cctvOnline:       'health-cctv',
        weatherTemp:      'health-weather',
        wanLatency:       'health-network'
      };
      const elId = elIdMap[key];
      const el = elId ? this._healthEls[elId] : null;

      if (el) {
        el.className = `health-status status-${status}`;
        setHealthStatus(el, value);
      }
    });
  }

  /**
   * Starts the heatmap breathing loop using requestAnimationFrame + setTimeout.
   * Skips the animation entirely when prefers-reduced-motion is set.
   * Queries the sector NodeList lazily and caches it for subsequent ticks.
   * @private
   */
  _startBreathingLoop() {
    if (this._prefersReducedMotion) return;

    const tick = () => {
      const stadiumMap = document.getElementById('stadium-map');
      if (stadiumMap && stadiumMap.classList.contains('stadium-map-heatmap')) {
        // Cache sectors lazily on first heatmap activation
        if (!this._sectors) {
          this._sectors = stadiumMap.querySelectorAll('.stadium-sector');
        }
        this._sectors.forEach(sec => {
          const base = parseFloat(sec.getAttribute('fill-opacity') || '0.55');
          const delta = (Math.random() - 0.5) * 0.08;
          sec.style.fillOpacity = Math.max(0.35, Math.min(0.85, base + delta));
        });
      }
      // Chain via setTimeout + rAF to achieve ~BREATHING_INTERVAL_MS cadence
      // without blocking the main thread on every frame.
      setTimeout(() => requestAnimationFrame(tick), BREATHING_INTERVAL_MS);
    };

    requestAnimationFrame(tick);
  }

  /**
   * Starts the periodic simulation loop that dispatches 'telemetryPacket'
   * events at TELEMETRY_UPDATE_INTERVAL_MS intervals.
   *
   * In a production integration, this loop is replaced by a WebSocket
   * or MQTT message handler that dispatches the same CustomEvent format.
   * @private
   */
  _startSimulationLoop() {
    setInterval(() => {
      // AI Cognitive confidence
      const aiConf = (99.0 + Math.random() * 0.9).toFixed(2);
      this._dispatch('aiCognition', `${aiConf}% NOMINAL`, 'nominal');

      // IoT Sensor array
      const iotCount = 412 - Math.floor(Math.random() * 3);
      this._dispatch('iotActiveSensors', `ACTIVE (${iotCount}/412)`, 'nominal');

      // CCTV Feed
      const cctvCount = 64 - Math.floor(Math.random() * 2);
      this._dispatch(
        'cctvOnline',
        cctvCount < 64 ? `DEGRADED (${cctvCount}/64)` : 'ONLINE (64/64)',
        cctvCount < 64 ? 'degraded' : 'nominal'
      );

      // Weather / Roof Sensor
      const temp = 66 + Math.floor(Math.random() * 4);
      this._dispatch('weatherTemp', `OPEN ROOF (${temp}°F)`, 'nominal');

      // WAN Latency
      const latency = 8 + Math.floor(Math.random() * 12);
      this._dispatch(
        'wanLatency',
        latency > 15 ? `DEGRADED (5G / ${latency}ms)` : `STABLE (5G / ${latency}ms)`,
        latency > 15 ? 'degraded' : 'nominal'
      );
    }, TELEMETRY_UPDATE_INTERVAL_MS);
  }

  /**
   * Convenience method to fire a telemetryPacket CustomEvent.
   * @param {string} key    AppState.telemetry property name.
   * @param {string} value  Display string for the health bar.
   * @param {string} status CSS status modifier: 'nominal' | 'degraded' | 'critical'.
   * @private
   */
  _dispatch(key, value, status) {
    this.dispatchEvent(new CustomEvent('telemetryPacket', { detail: { key, value, status } }));
  }

  /**
   * Injects an external telemetry packet — the entry point for a real
   * WebSocket or MQTT message handler.
   *
   * @param {string} key    Telemetry metric key (must match AppState.telemetry keys).
   * @param {string} value  Human-readable display string.
   * @param {string} status 'nominal' | 'degraded' | 'critical'.
   */
  injectPacket(key, value, status) {
    this._dispatch(key, value, status);
  }
}

/** Singleton instance shared across all importing modules. */
export const telemetryManager = new TelemetryManager();

// ---------------------------------------------------------------------------
// Live Event Feed
// ---------------------------------------------------------------------------

/**
 * Appends a timestamped log line to the live event feed container.
 * Enforces a MAX_LIVE_EVENTS ceiling by evicting the oldest entry when
 * the limit is exceeded, preventing unbounded DOM growth.
 * Plays a sound alert and optionally fires a toast for critical event types.
 *
 * @param {Object} state   Central AppState object.
 * @param {string} type    Event tag type: 'match' | 'nav' | 'alert' | 'security' | 'transit' | 'weather' | 'system'.
 * @param {string} text    Event body content (displayed as plain text, never HTML).
 */
export function appendLiveEvent(state, type, text) {
  const container = document.getElementById('live-event-feed-container');
  if (!container) return;

  // Remove placeholder on first real event
  const placeholder = container.querySelector('.feed-placeholder');
  if (placeholder) placeholder.remove();

  // Build log line using safe DOM API — no innerHTML for dynamic content
  const timeStr = formatTime();
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

  // Enforce MAX_LIVE_EVENTS ceiling — evict oldest entry
  const lines = container.querySelectorAll('.feed-log-line');
  if (lines.length > MAX_LIVE_EVENTS) {
    lines[0].remove();
  }

  // Audio feedback
  if (type === 'alert' || type === 'security') {
    playRetroSound('warn');
  } else if (type === 'transit' || type === 'weather') {
    playRetroSound('beep');
  } else {
    playRetroSound('boop');
  }

  // Toast dispatch for high-priority events only
  const toastMap = {
    alert:    ['System Alert', 'warning'],
    security: ['Security Dispatch', 'alert'],
    transit:  ['Transit Dispatch', 'system'],
    weather:  ['Environmental Update', 'system']
  };
  if (toastMap[type]) {
    showToast(toastMap[type][0], text, toastMap[type][1]);
  }
}
