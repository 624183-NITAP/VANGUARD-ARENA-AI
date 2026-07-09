/**
 * Centralized stadium operations configuration constants.
 *
 * All hardcoded values that drive simulation logic, telemetry thresholds,
 * rate limiting, and validation live here. Modules should import from this
 * file rather than embedding magic numbers inline.
 */
"use strict";

// ---------------------------------------------------------------------------
// Stadium Attendance & Telemetry Nominal Values
// ---------------------------------------------------------------------------

/** Total announced live attendance for the current match. */
export const DEFAULT_ATTENDANCE = 82300;

/** Nominal AI cognition confidence percentage. */
export const NOMINAL_AI_CONFIDENCE = 99.4;

/** Nominal total active IoT sensor count. */
export const NOMINAL_IOT_TELEMETRY = 412;

/** Nominal total online CCTV camera count. */
export const NOMINAL_CCTV_ONLINE = 64;

/** Nominal ambient temperature in Fahrenheit. */
export const NOMINAL_WEATHER_TEMP = 68;

/** Nominal WAN latency in milliseconds. */
export const DEFAULT_WAN_LATENCY = 12;

// ---------------------------------------------------------------------------
// Sustainability & Eco Points
// ---------------------------------------------------------------------------

/** Starting eco points awarded to each new fan session. */
export const INITIAL_ECO_POINTS = 120;

/** Eco points threshold for the Platinum Champion carbon tier. */
export const ECO_PLATINUM_TIER_LIMIT = 200;

// ---------------------------------------------------------------------------
// Gate Wait Times (minutes)
// ---------------------------------------------------------------------------

/**
 * Baseline gate wait times used for Dijkstra crowd-avoidance edge weights
 * and initial predictions calculations.
 *
 * @type {Record<string, number>}
 */
export const DEFAULT_GATE_WAIT_TIMES = {
  'Gate A': 22,
  'Gate B': 4,
  'Gate C': 11,
  'Gate D': 8
};

// ---------------------------------------------------------------------------
// Camera Counts Per Gate
// ---------------------------------------------------------------------------

/**
 * CCTV camera count per gate zone, used for telemetry health reporting.
 * @type {Record<string, number>}
 */
export const CCTVS_PER_GATE = {
  'Gate A': 16,
  'Gate B': 16,
  'Gate C': 16,
  'Gate D': 16
};

// ---------------------------------------------------------------------------
// IoT Sensor Counts Per Sector
// ---------------------------------------------------------------------------

/**
 * Number of active IoT sensors per seating sector. Used in scanner
 * throughput formulas inside predictions.js.
 * @type {Record<string, number>}
 */
export const TELEMETRY_SENSORS_PER_SECTOR = {
  '101': 51,
  '102': 51,
  '103': 52,
  '104': 52,
  '105': 51,
  '106': 51,
  '107': 52,
  '108': 52
};

// ---------------------------------------------------------------------------
// Crowd Density Baseline Values (0.0 – 1.0)
// ---------------------------------------------------------------------------

/**
 * Baseline crowd density per sector. Used for pathfinding edge weight
 * penalties in crowd-avoidance mode and density prediction output.
 * @type {Record<string, number>}
 */
export const SECTOR_CROWD_DENSITIES = {
  '101': 0.94,
  '102': 0.88,
  '103': 0.72,
  '104': 0.96,
  '105': 0.61,
  '106': 0.45,
  '107': 0.82,
  '108': 0.50
};

// ---------------------------------------------------------------------------
// Facility Queue Wait Times (minutes)
// ---------------------------------------------------------------------------

/**
 * Restroom queue wait times per sector concourse.
 * @type {Record<string, number>}
 */
export const RESTROOM_QUEUES = {
  '104': 15,
  '103': 1,
  '102': 2
};

/**
 * Concession stand queue wait times per sector.
 * @type {Record<string, number>}
 */
export const CONCESSION_QUEUES = {
  '104': 18,
  '105': 8
};

// ---------------------------------------------------------------------------
// Timing Intervals (milliseconds)
// ---------------------------------------------------------------------------

/** How often the telemetry health bar refreshes. */
export const TELEMETRY_UPDATE_INTERVAL_MS = 4000;

/** How often the SVG heatmap opacity breathing animation ticks. */
export const BREATHING_INTERVAL_MS = 1200;

/** How often the live event feed auto-appends a new entry (endless loop). */
export const LIVE_EVENT_INTERVAL_MS = 18000;

/** Delay between sequentially loading initial event entries on page load. */
export const LIVE_EVENT_LOAD_INTERVAL_MS = 3500;

// ---------------------------------------------------------------------------
// Feed & Chat Limits
// ---------------------------------------------------------------------------

/** Maximum number of feed log lines retained in the DOM (prevents layout thrash). */
export const MAX_LIVE_EVENTS = 100;

/** Maximum characters accepted from a user chat input field. */
export const MAX_CHAT_LENGTH = 1000;

/** Minimum milliseconds between consecutive chat submissions (rate limiting). */
export const CHAT_RATE_LIMIT_MS = 1500;

// ---------------------------------------------------------------------------
// Routing Validation
// ---------------------------------------------------------------------------

/**
 * Allowed route preference identifiers for the wayfinding algorithm.
 * @type {string[]}
 */
export const ROUTE_PREFERENCES = ['fastest', 'crowd-avoidance', 'green'];

/**
 * Valid gate identifiers accepted by the routing system.
 * @type {string[]}
 */
export const VALID_GATES = ['Gate A', 'Gate B', 'Gate C', 'Gate D'];

/**
 * Valid sector identifiers accepted by the routing system.
 * @type {string[]}
 */
export const VALID_SECTORS = ['101', '102', '103', '104', '105', '106', '107', '108'];
