import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Parse index.html structure
const htmlPath = path.resolve(process.cwd(), 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

describe('Vanguard Arena AI - Unit Tests', () => {
  let VanguardOps;

  beforeAll(async () => {
    // Set inner HTML in JSDOM context
    document.body.innerHTML = htmlContent;

    // Mock prompt before DOMContentLoaded fires (prompt key check)
    global.window.prompt = vi.fn().mockReturnValue('dummy-api-key');

    // Mock AudioContext and other Web APIs to prevent errors during DOM load
    global.window.AudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: () => ({
        type: '',
        frequency: { value: 0, setValueAtTime: vi.fn() },
        connect: () => {},
        start: () => {},
        stop: () => {}
      }),
      createGain: () => ({
        gain: { value: 0, setValueAtTime: vi.fn() },
        connect: () => {}
      }),
      destination: {},
      state: 'running',
      close: vi.fn()
    }));
    global.window.webkitAudioContext = global.window.AudioContext;
    
    // Mock speech APIs
    global.window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => []
    };
    global.window.SpeechSynthesisUtterance = vi.fn();
    
    // Mock Lucide icon renderer
    const lucideMock = { createIcons: vi.fn() };
    global.window.lucide = lucideMock;

    // Load and execute app.js code
    const appPath = path.resolve(process.cwd(), 'app.js');
    await import(appPath);

    // Trigger DOMContentLoaded manually
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Retrieve exposed helper methods
    VanguardOps = window.VanguardOps;
  });

  it('should expose VanguardOps namespace', () => {
    expect(VanguardOps).toBeDefined();
  });

  it('should compute correct coordinates for gates and sectors', () => {
    expect(VanguardOps.gateCoords['Gate B']).toEqual({ x: 730, y: 300 });
    expect(VanguardOps.sectorCoords['104']).toBeDefined();
  });

  it('should support event feed generation and append log lines correctly', () => {
    const container = document.getElementById('live-event-feed-container');
    expect(container).toBeDefined();
    
    const countBefore = container.querySelectorAll('.feed-log-line').length;
    VanguardOps.appendLiveEvent('match', "Test Match Event Log");
    
    const lines = container.querySelectorAll('.feed-log-line');
    expect(lines.length).toBeGreaterThan(countBefore);
    expect(lines[lines.length - 1].querySelector('.feed-text').textContent).toBe("Test Match Event Log");
  });

  it('should support dynamic crowd predictions text output formatting', () => {
    const predictions = VanguardOps.simulateLocalPredictions();
    expect(predictions).toContain('GenAI Operations Strategy Recommendation');
    expect(predictions).toContain('Gate B (East)');
  });

  it('should calculate and draw route path coordinates on map SVG', () => {
    VanguardOps.drawRoutePath('Gate B', '104', false);
    
    const pathElement = document.getElementById('active-routing-path');
    const pathGlow = document.getElementById('active-routing-path-glow');
    const pathTracker = document.getElementById('active-routing-tracker');
    
    expect(pathElement).not.toBeNull();
    expect(pathElement.style.display).toBe('block');
    expect(pathElement.getAttribute('d')).toContain('M 730 300');
    expect(pathGlow).not.toBeNull();
    expect(pathGlow.style.display).toBe('block');
    expect(pathTracker).not.toBeNull();
    expect(pathTracker.style.display).toBe('block');
  });

  it('should clear route path details correctly', () => {
    VanguardOps.clearRoutePath();
    const pathElement = document.getElementById('active-routing-path');
    const pathGlow = document.getElementById('active-routing-path-glow');
    const pathTracker = document.getElementById('active-routing-tracker');
    
    expect(pathElement.style.display).toBe('none');
    expect(pathGlow.style.display).toBe('none');
    expect(pathTracker.style.display).toBe('none');
  });

  it('should handle toast alerts dispatch', () => {
    const toastContainer = document.getElementById('toast-container');
    expect(toastContainer).toBeDefined();
    
    VanguardOps.showToast("Test Toast", "Test Message Detail", "alert");
    const toasts = toastContainer.querySelectorAll('.toast');
    expect(toasts.length).toBeGreaterThan(0);
    expect(toasts[toasts.length - 1].querySelector('.toast-title').textContent).toBe("Test Toast");
  });
});
