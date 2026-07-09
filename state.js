/**
 * Centralized AppState model for the Vanguard Arena dashboard.
 *
 * All modules receive a reference to this object rather than maintaining
 * their own isolated state variables. This creates a single source of
 * truth and enables independent testability of business logic.
 */
"use strict";

import { INITIAL_ECO_POINTS } from './constants.js';

/**
 * @typedef {Object} TelemetryState
 * @property {number} aiCognition      AI confidence percentage.
 * @property {number} iotActiveSensors Active IoT sensor count.
 * @property {number} cctvOnline       Online CCTV camera count.
 * @property {number} weatherTemp      Current temperature in Fahrenheit.
 * @property {number} wanLatency       WAN round-trip latency in ms.
 * @property {number} attendance       Total live attendance.
 */

/**
 * @typedef {Object} PredictionsState
 * @property {number} confidence     Last computed confidence score (0–100).
 * @property {string} resultsHtml    Last rendered prediction HTML.
 */

/**
 * @typedef {Object} RoutingState
 * @property {string}  gate          Currently selected entry gate.
 * @property {string}  sector        Currently selected destination sector.
 * @property {boolean} accessible    Whether wheelchair-accessible route is active.
 * @property {string}  preference    Route optimization mode.
 * @property {?string} activePathD   Active SVG path 'd' attribute value, or null.
 */

/**
 * @typedef {Object} ChatbotState
 * @property {Array<{role:string, text:string}>} messageHistory Chat history array.
 * @property {number} lastMessageTime  Timestamp (ms) of last submitted message.
 */

/**
 * @typedef {Object} UIState
 * @property {string}  activeView        Current panel: 'staff' or 'fan'.
 * @property {string}  activeTab         Current fan tab: 'assistant'|'navigation'|'sustainability'|'predictions'.
 * @property {?string} activeMapOverlay  Current map overlay CSS class, or null.
 */

/**
 * Global application state. Passed by reference to every module's init()
 * function. Mutations are always performed via property assignment on this
 * object so all modules observe the same values.
 *
 * @type {{
 *   language: string,
 *   activeIncidentId: string,
 *   isRecording: boolean,
 *   ecoPoints: number,
 *   customIncidentCounter: number,
 *   liveEventIndex: number,
 *   recognition: ?SpeechRecognition,
 *   isAccessibilityMode: boolean,
 *   telemetry: TelemetryState,
 *   predictions: PredictionsState,
 *   routing: RoutingState,
 *   chatbot: ChatbotState,
 *   ui: UIState
 * }}
 */
export const AppState = {
  /** BCP-47 language tag for the current user locale. */
  language: 'en',

  /** ID of the incident currently selected in the operations console. */
  activeIncidentId: '1',

  /** True while speech recognition is actively listening. */
  isRecording: false,

  /** Accumulated eco points for the current fan session. */
  ecoPoints: INITIAL_ECO_POINTS,

  /** Auto-incrementing counter used to generate unique custom incident IDs. */
  customIncidentCounter: 3,

  /** Pointer into the retroLiveEventsPool for sequential initial loading. */
  liveEventIndex: 0,

  /** SpeechRecognition instance, or null if Web Speech API is unavailable. */
  recognition: null,

  /** True when high-contrast accessibility mode is active on the body. */
  isAccessibilityMode: false,

  // --- Telemetry Subsystem ---
  telemetry: {
    aiCognition: 99.4,
    iotActiveSensors: 412,
    cctvOnline: 64,
    weatherTemp: 68,
    wanLatency: 12,
    attendance: 82300
  },

  // --- Crowd Predictions Subsystem ---
  predictions: {
    confidence: 100,
    resultsHtml: ''
  },

  // --- Wayfinding Routing Subsystem ---
  routing: {
    gate: 'Gate B',
    sector: '104',
    accessible: false,
    preference: 'fastest',
    activePathD: null
  },

  // --- Chatbot Subsystem ---
  chatbot: {
    messageHistory: [],
    /** Timestamp (ms since epoch) of the most recent chat submission. */
    lastMessageTime: 0
  },

  // --- UI Subsystem ---
  ui: {
    /** Currently visible top-level panel. */
    activeView: 'staff',
    /** Currently active fan tab name. */
    activeTab: 'assistant',
    /** CSS class of the active SVG map overlay, or null for none. */
    activeMapOverlay: null
  }
};
