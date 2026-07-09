/**
 * SVG Map navigation overlay drawing and path management logic.
 */
"use strict";

import { gateCoords, sectorCoords } from './config.js';

/**
 * Draws a glowing, dashed routing path from a gate entry to a destination sector on the SVG map.
 * Supports wheelchair-accessible alternate path adjustments.
 * @param {string} gate The entry gate identifier (e.g. 'Gate B').
 * @param {string} sector The target sector identifier (e.g. '104').
 * @param {boolean} accessible Whether step-free routing is requested.
 */
export function drawRoutePath(gate, sector, accessible) {
  const gCoord = gateCoords[gate];
  const sCoord = sectorCoords[sector];
  if (!gCoord || !sCoord) return;
  
  const stadiumMap = document.getElementById('stadium-map');
  if (!stadiumMap) return;
  
  const X0 = 400;
  const Y0 = 300;
  const Rc = accessible ? 230 : 190; 
  
  const thetaGate = Math.atan2(gCoord.y - Y0, gCoord.x - X0);
  const thetaSec = Math.atan2(sCoord.y - Y0, sCoord.x - X0);
  
  const cx1 = X0 + Rc * Math.cos(thetaGate);
  const cy1 = Y0 + Rc * Math.sin(thetaGate);
  const cx2 = X0 + Rc * Math.cos(thetaSec);
  const cy2 = Y0 + Rc * Math.sin(thetaSec);
  
  let angleDiff = thetaSec - thetaGate;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  
  const largeArcFlag = Math.abs(angleDiff) > Math.PI / 2 ? 1 : 0;
  const sweepFlag = angleDiff > 0 ? 1 : 0;
  
  const pathD = `M ${gCoord.x} ${gCoord.y} L ${cx1.toFixed(1)} ${cy1.toFixed(1)} A ${Rc} ${Rc} 0 ${largeArcFlag} ${sweepFlag} ${cx2.toFixed(1)} ${cy2.toFixed(1)} L ${sCoord.x} ${sCoord.y}`;
  
  // 1. Background glow path
  let routePathGlow = document.getElementById('active-routing-path-glow');
  if (!routePathGlow) {
    routePathGlow = document.createElementNS("http://www.w3.org/2000/svg", "path");
    routePathGlow.setAttribute('id', 'active-routing-path-glow');
    routePathGlow.setAttribute('class', 'active-routing-path-glow');
    stadiumMap.appendChild(routePathGlow);
  }
  routePathGlow.setAttribute('d', pathD);
  routePathGlow.style.display = 'block';

  // 2. Foreground dashed path
  let routePath = document.getElementById('active-routing-path');
  if (!routePath) {
    routePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    routePath.setAttribute('id', 'active-routing-path');
    routePath.setAttribute('class', 'active-routing-path');
    stadiumMap.appendChild(routePath);
  }
  routePath.setAttribute('d', pathD);
  routePath.style.display = 'block';

  // 3. Animated tracking indicator dot
  let routeTracker = document.getElementById('active-routing-tracker');
  if (!routeTracker) {
    routeTracker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    routeTracker.setAttribute('id', 'active-routing-tracker');
    routeTracker.setAttribute('r', '6');
    routeTracker.setAttribute('fill', '#ffffff');
    routeTracker.setAttribute('style', 'filter: drop-shadow(0 0 5px var(--neon-green));');
    
    const animateMotion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    animateMotion.setAttribute('id', 'active-routing-tracker-animation');
    animateMotion.setAttribute('dur', '4s');
    animateMotion.setAttribute('repeatCount', 'indefinite');
    routeTracker.appendChild(animateMotion);
    
    stadiumMap.appendChild(routeTracker);
  }
  
  const anim = document.getElementById('active-routing-tracker-animation');
  if (anim) {
    anim.setAttribute('path', pathD);
  }
  routeTracker.style.display = 'block';
}

/**
 * Hides all active routing paths, glows, and tracking dots on the SVG map.
 */
export function clearRoutePath() {
  const routePath = document.getElementById('active-routing-path');
  const routePathGlow = document.getElementById('active-routing-path-glow');
  const routeTracker = document.getElementById('active-routing-tracker');
  
  if (routePath) routePath.style.display = 'none';
  if (routePathGlow) routePathGlow.style.display = 'none';
  if (routeTracker) routeTracker.style.display = 'none';
}
