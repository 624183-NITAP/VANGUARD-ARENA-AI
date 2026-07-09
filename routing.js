/**
 * Graph-based wayfinding routing algorithm using Dijkstra's shortest path.
 *
 * The stadium is modeled as a weighted graph where nodes represent physical
 * locations (gates, concourse junctions, seating sectors) and edges carry
 * weights that encode:
 *   - Euclidean distance between node coordinates
 *   - Crowd avoidance penalties (based on SECTOR_CROWD_DENSITIES and gate wait times)
 *   - Eco-route discounts (30% weight reduction for designated sustainability corridors)
 *   - Accessibility constraints (stairway edges are removed for wheelchair routes)
 *
 * The algorithm is Dijkstra's with a simple array-based priority queue.
 * For the stadium scale (< 30 nodes) this is O(V² log V) but perfectly adequate.
 * A binary heap priority queue would be an easy upgrade if the node count grows.
 */
"use strict";

import { gateCoords, sectorCoords } from './config.js';
import { DEFAULT_GATE_WAIT_TIMES, SECTOR_CROWD_DENSITIES } from './constants.js';

// ---------------------------------------------------------------------------
// Waypoint Coordinates
// ---------------------------------------------------------------------------

/**
 * SVG coordinate positions for internal navigation waypoints (concourse
 * segments and accessibility infrastructure). Not exposed in the UI — used
 * only as intermediate routing nodes in the graph.
 *
 * @type {Record<string, {x: number, y: number}>}
 */
export const junctionCoords = {
  'Concourse North':  { x: 400, y: 150 },
  'Concourse East':   { x: 610, y: 300 },
  'Concourse South':  { x: 400, y: 450 },
  'Concourse West':   { x: 190, y: 300 },
  'Elevator Hub East':{ x: 650, y: 300 },
  'Elevator Hub West':{ x: 150, y: 300 },
  'Escalator East':   { x: 570, y: 300 },
  'Escalator West':   { x: 230, y: 300 }
};

// ---------------------------------------------------------------------------
// Coordinate Lookup
// ---------------------------------------------------------------------------

/**
 * Returns the SVG {x, y} coordinate for any graph node by name.
 * Searches gates, sectors, and junction waypoints in priority order.
 * Falls back to the stadium center {400, 300} for unknown nodes.
 *
 * @param {string} name Node identifier string.
 * @returns {{x: number, y: number}} The coordinate object.
 */
export function getNodeCoord(name) {
  return gateCoords[name] || sectorCoords[name] || junctionCoords[name] || { x: 400, y: 300 };
}

// ---------------------------------------------------------------------------
// Graph Construction
// ---------------------------------------------------------------------------

/**
 * Builds the weighted stadium graph as an adjacency list.
 *
 * Each call constructs a fresh graph object so preference and accessibility
 * settings are fully baked into the edge weights — no mutation of shared state.
 *
 * Edge weight formula:
 *   weight = euclideanDistance(u, v)
 *          × crowdMultiplier  (if preference === 'crowd-avoidance')
 *          × ecoDiscount      (if preference === 'green' and options.ecoPath)
 *
 * Stairway edges (options.stairs === true) are silently dropped when
 * accessible === true, making those paths unreachable for Dijkstra.
 *
 * @param {boolean} accessible  True for wheelchair-accessible routing.
 * @param {string}  preference  'fastest' | 'crowd-avoidance' | 'green'.
 * @returns {Record<string, Array<{target: string, weight: number}>>} Adjacency list.
 */
export function buildStadiumGraph(accessible, preference) {
  /** @type {Record<string, Array<{target: string, weight: number}>>} */
  const graph = {};

  /**
   * Adds a bidirectional edge u↔v with computed weight.
   * @param {string} u Source node.
   * @param {string} v Target node.
   * @param {{stairs?: boolean, ecoPath?: boolean}} [options] Edge metadata.
   */
  const addEdge = (u, v, options = {}) => {
    // Wheelchair routing: skip stairway edges entirely
    if (accessible && options.stairs) return;

    if (!graph[u]) graph[u] = [];
    if (!graph[v]) graph[v] = [];

    const c1 = getNodeCoord(u);
    const c2 = getNodeCoord(v);
    let weight = _euclidean(c1, c2);

    if (preference === 'crowd-avoidance') {
      // Penalise high-density sectors and congested gates
      let crowdMultiplier = 1.0;
      if (SECTOR_CROWD_DENSITIES[u]) crowdMultiplier += SECTOR_CROWD_DENSITIES[u] * 2.0;
      if (SECTOR_CROWD_DENSITIES[v]) crowdMultiplier += SECTOR_CROWD_DENSITIES[v] * 2.0;
      if (DEFAULT_GATE_WAIT_TIMES[u]) crowdMultiplier += DEFAULT_GATE_WAIT_TIMES[u] / 10.0;
      if (DEFAULT_GATE_WAIT_TIMES[v]) crowdMultiplier += DEFAULT_GATE_WAIT_TIMES[v] / 10.0;
      weight *= crowdMultiplier;
    }

    if (preference === 'green' && options.ecoPath) {
      // 30% weight discount for sustainability-designated corridors
      weight *= 0.7;
    }

    graph[u].push({ target: v, weight });
    graph[v].push({ target: u, weight });
  };

  // --- Gate → Concourse connections ---
  addEdge('Gate A', 'Concourse North', { ecoPath: true });
  addEdge('Gate B', 'Concourse East',  { ecoPath: false });
  addEdge('Gate C', 'Concourse South', { ecoPath: true });
  addEdge('Gate D', 'Concourse West',  { ecoPath: false });

  // --- Concourse ring connections ---
  addEdge('Concourse North', 'Concourse East',  { ecoPath: true });
  addEdge('Concourse East',  'Concourse South', { ecoPath: false });
  addEdge('Concourse South', 'Concourse West',  { ecoPath: true });
  addEdge('Concourse West',  'Concourse North', { ecoPath: false });

  // --- Concourse → Sector connections ---
  addEdge('Concourse North', '101', { ecoPath: true });
  addEdge('Concourse North', '107', { ecoPath: true });
  addEdge('Concourse East',  '102', { ecoPath: false });
  addEdge('Concourse East',  '104', { ecoPath: false });
  addEdge('Concourse South', '103', { ecoPath: true });
  addEdge('Concourse South', '105', { ecoPath: true });
  addEdge('Concourse West',  '106', { ecoPath: false });
  addEdge('Concourse West',  '108', { ecoPath: false });

  // --- Accessibility infrastructure (East side) ---
  addEdge('Concourse East', 'Elevator Hub East', { ecoPath: true });
  addEdge('Concourse East', 'Escalator East',    { stairs: true });
  addEdge('Elevator Hub East', '104',            { ecoPath: true });
  addEdge('Escalator East',    '104',            { stairs: true });

  // --- Accessibility infrastructure (West side) ---
  addEdge('Concourse West', 'Elevator Hub West', { ecoPath: true });
  addEdge('Concourse West', 'Escalator West',    { stairs: true });
  addEdge('Elevator Hub West', '106',            { ecoPath: true });
  addEdge('Escalator West',    '106',            { stairs: true });

  return graph;
}

// ---------------------------------------------------------------------------
// Dijkstra's Shortest Path
// ---------------------------------------------------------------------------

/**
 * Finds the optimal path between two graph nodes using Dijkstra's algorithm.
 *
 * Time complexity: O(V² log V) with array-based priority queue.
 * Adequate for the stadium graph (< 30 nodes). A binary heap would improve
 * performance for significantly larger graphs.
 *
 * @param {string}  start      Starting node identifier. Must be non-empty.
 * @param {string}  end        Destination node identifier. Must be non-empty.
 * @param {boolean} accessible True for wheelchair-accessible routing.
 * @param {string}  preference Route mode: 'fastest' | 'crowd-avoidance' | 'green'.
 * @returns {{ path: string[], distance: number }} Optimal path nodes list
 *   and total weighted distance. Returns {[start, end], 999} if unreachable.
 * @throws {Error} If start or end are not non-empty strings.
 */
export function findOptimalPath(start, end, accessible, preference) {
  if (!start || typeof start !== 'string') throw new Error('Invalid start node');
  if (!end   || typeof end   !== 'string') throw new Error('Invalid end node');

  const graph = buildStadiumGraph(accessible, preference);

  // If either node doesn't appear in the graph, return a direct stub path
  if (!graph[start] || !graph[end]) {
    return { path: [start, end], distance: 999 };
  }

  const distances = {};
  const previous  = {};
  const queue     = [];

  for (const node of Object.keys(graph)) {
    distances[node] = Infinity;
    previous[node]  = null;
  }
  distances[start] = 0;
  queue.push({ node: start, dist: 0 });

  while (queue.length > 0) {
    // Extract the node with the smallest tentative distance
    queue.sort((a, b) => a.dist - b.dist);
    const { node: current } = queue.shift();

    if (current === end) break;

    for (const { target, weight } of (graph[current] || [])) {
      const alt = distances[current] + weight;
      if (alt < distances[target]) {
        distances[target] = alt;
        previous[target]  = current;
        queue.push({ node: target, dist: alt });
      }
    }
  }

  // Reconstruct path by walking previous[] back from end to start
  const path = [];
  let curr = end;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }

  if (distances[end] === Infinity) {
    return { path: [start, end], distance: 999 };
  }

  return { path, distance: Math.round(distances[end]) };
}

// ---------------------------------------------------------------------------
// SVG Path Generation
// ---------------------------------------------------------------------------

/**
 * Generates an SVG path 'd' attribute string from an ordered list of node names.
 * Uses M (move-to) for the first point and L (line-to) for subsequent points.
 *
 * @param {string[]} pathNodes Ordered list of node names along the route.
 * @returns {string} SVG path 'd' attribute value, or empty string if no nodes.
 */
export function generateSVGPathFromJunctions(pathNodes) {
  if (!pathNodes || pathNodes.length === 0) return '';

  const points = pathNodes.map(name => getNodeCoord(name));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Private Utilities
// ---------------------------------------------------------------------------

/**
 * Calculates the Euclidean distance between two 2D coordinate objects.
 *
 * @param {{x: number, y: number}} c1 First coordinate.
 * @param {{x: number, y: number}} c2 Second coordinate.
 * @returns {number} The straight-line distance.
 * @private
 */
function _euclidean(c1, c2) {
  return Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
}
