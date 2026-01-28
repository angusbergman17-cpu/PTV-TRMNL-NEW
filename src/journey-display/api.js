/**
 * Journey Display API - Express router for journey display endpoints
 * Copyright (c) 2026 Angus Bergman - Licensed under CC BY-NC 4.0
 */

import express from 'express';
import { TransportMode, JourneyDisplay, JourneyStep, StepStatus, JourneyStatus } from './models.js';
import { JourneyDisplayEngine, JourneyConfig, TransitLegConfig } from './engine.js';
import JourneyDisplayRenderer from './renderer.js';
import { getDiffTracker } from './diff.js';

const router = express.Router();
let engine = null, renderer = null, currentJourney = null, journeyConfig = null;

export function initJourneyDisplay(preferences) {
  engine = new JourneyDisplayEngine(); renderer = new JourneyDisplayRenderer();
  updateConfigFromPreferences(preferences);
  console.log('✅ Journey Display system initialized');
}

export function updateConfigFromPreferences(preferences) {
  const prefs = preferences?.get() || {};
  journeyConfig = new JourneyConfig({
    homeAddress: prefs.addresses?.home || '1 Clara Street, South Yarra',
    workAddress: prefs.addresses?.work || '80 Collins Street, Melbourne',
    cafeEnabled: prefs.coffee?.enabled !== false,
    cafeName: prefs.addresses?.cafeName || prefs.coffee?.name || 'Norman',
    cafeAddress: prefs.addresses?.cafe || '',
    cafeDuration: prefs.coffee?.duration || 5,
    cafePosition: prefs.coffee?.position || 'before-transit',
    targetArrivalTime: prefs.journey?.arrivalTime || prefs.arrivalTime || '09:00',
    state: prefs.state || prefs.location?.state || 'VIC',
    transitSteps: buildTransitSteps(prefs),
    walkingTimes: prefs.manualWalkingTimes || {}
  });
}

function buildTransitSteps(prefs) {
  const steps = [], route = prefs.journey?.transitRoute || {};
  for (let i = 1; i <= (route.numberOfModes || 2); i++) {
    const m = route[`mode${i}`]; if (!m) continue;
    steps.push(new TransitLegConfig({ mode: m.type ?? m.routeType ?? TransportMode.TRAIN, routeNumber: m.routeNumber,
      originStopName: m.originStation?.name || '', destinationStopName: m.destinationStation?.name || '',
      direction: m.direction || `to ${m.destinationStation?.name || 'Destination'}`, estimatedDuration: m.estimatedDuration || 15 }));
  }
  return steps;
}

export async function calculateJourney(liveData = {}) {
  if (!engine || !journeyConfig) throw new Error('Journey display not initialized');
  currentJourney = engine.buildJourneyDisplay(journeyConfig, liveData);
  return currentJourney;
}

export function getCurrentJourney() { return currentJourney; }
export function renderJourneyPNG(journey) { if (!renderer) throw new Error('Renderer not initialized'); return renderer.render(journey || currentJourney); }
export function renderJourneyBase64(journey) { if (!renderer) throw new Error('Renderer not initialized'); return renderer.renderBase64(journey || currentJourney); }

async function getLiveDataFromServices() {
  const liveData = { liveDepartures: [], disruptions: [], weather: null };
  try { if (global.weatherBOM) { const w = await global.weatherBOM.getCurrentWeather(); if (w) liveData.weather = { temperature: w.temperature, condition: w.condition?.short || w.description }; } } catch (e) { console.warn('⚠️ Weather fetch failed:', e.message); }
  return liveData;
}

router.get('/', async (req, res) => {
  try {
    const format = req.query.format || 'png';
    if (!currentJourney) await calculateJourney(await getLiveDataFromServices());
    if (format === 'json') res.json(currentJourney.toJSON());
    else if (format === 'base64') res.json({ image: renderJourneyBase64(currentJourney) });
    else { res.set('Content-Type', 'image/png'); res.set('Cache-Control', 'no-cache'); res.send(renderJourneyPNG(currentJourney)); }
  } catch (e) { console.error('❌ Journey display error:', e); res.status(500).json({ error: e.message }); }
});

router.get('/regions', async (req, res) => {
  try {
    await calculateJourney(await getLiveDataFromServices());
    const diffTracker = getDiffTracker(), changes = diffTracker.calculateChanges(currentJourney);
    res.json({ changed: changes.changed, regions: diffTracker.getMergedRegions(changes.regions), needsFullRefresh: changes.needsFullRefresh, stats: diffTracker.getStats() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/preview', async (req, res) => {
  try {
    await calculateJourney(await getLiveDataFromServices());
    res.send(`<!DOCTYPE html><html><head><title>Journey Display</title><meta http-equiv="refresh" content="20"><style>body{margin:0;padding:20px;background:#333;display:flex;flex-direction:column;align-items:center}h1{color:white}.display{width:800px;height:480px;background:white;border:4px solid #000;border-radius:8px;overflow:hidden}.display img{width:100%;height:100%}.info{color:#aaa;margin-top:20px}</style></head><body><h1>🚃 Journey Display</h1><div class="display"><img src="/api/journey-display?t=${Date.now()}"></div><div class="info">Auto-refreshes every 20s | ${new Date().toLocaleString()}</div></body></html>`);
  } catch (e) { res.status(500).send(`<h1>Error</h1><pre>${e.message}</pre>`); }
});

router.get('/trmnl', async (req, res) => {
  try {
    await calculateJourney(await getLiveDataFromServices());
    res.json({ image: renderJourneyBase64(currentJourney), orientation: 'landscape', refresh_rate: 20 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/demo', async (req, res) => {
  try {
    const scenario = req.query.scenario || 'normal', format = req.query.format || 'png';
    const demo = createDemoJourney(scenario);
    if (format === 'json') res.json(demo.toJSON());
    else if (format === 'base64') res.json({ image: renderer.renderBase64(demo), scenario });
    else { res.set('Content-Type', 'image/png'); res.send(renderer.render(demo)); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function createDemoJourney(scenario) {
  const now = new Date(), arrival = new Date(now); arrival.setHours(9, 0, 0, 0);
  if (arrival < now) arrival.setDate(arrival.getDate() + 1);
  const journey = new JourneyDisplay({
    originAddress: '1 CLARA ST, SOUTH YARRA', destinationAddress: '80 COLLINS ST, MELBOURNE', currentTime: now,
    dayOfWeek: now.toLocaleDateString('en-AU', { weekday: 'long' }), dateString: now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' }),
    arrivalTime: arrival, temperature: 22, weatherCondition: 'Sunny', bringUmbrella: false, destinationLabel: '80 COLLINS ST, MELBOURNE', dataSource: 'demo'
  });
  journey.addStep(new JourneyStep({ mode: TransportMode.WALK, title: 'Walk to Norman Cafe', subtitle: 'From home • 300 Toorak Rd', duration: 4 }));
  journey.addStep(new JourneyStep({ mode: TransportMode.COFFEE, title: 'Coffee at Norman', subtitle: '✓ TIME FOR COFFEE', duration: 5, coffeeDecision: 'time', isOptional: true }));
  journey.addStep(new JourneyStep({ mode: TransportMode.WALK, title: 'Walk to South Yarra Stn', subtitle: 'Platform 1', duration: 6 }));
  journey.addStep(new JourneyStep({ mode: TransportMode.TRAIN, title: 'Train to Parliament', subtitle: 'Sandringham • Next: 5, 12 min', duration: 5, nextDepartures: [5, 12] }));
  journey.addStep(new JourneyStep({ mode: TransportMode.WALK, title: 'Walk to Office', subtitle: 'Parliament → 80 Collins St', duration: 26 }));
  
  if (scenario === 'delay') { journey.applyDelayToStep(4, 8); journey.steps[3].subtitle = 'Sandringham • +8 MIN • Next: 12, 20 min'; }
  else if (scenario === 'skip-coffee') { journey.skipStep(2, 'Running late'); journey.steps[0].title = 'Walk past Norman Cafe'; }
  else if (scenario === 'disruption') { journey.cancelStep(4, 'Signal fault'); journey.steps[3].title = '▲ Sandringham Line'; journey.steps[3].subtitle = 'SUSPENDED — Signal fault'; journey.extendStep(2, 5, 'Disruption'); journey.steps[1].subtitle = '✓ EXTRA TIME — Disruption'; }
  
  journey.recalculateTotals();
  return journey;
}

export { router as journeyDisplayRouter };
export default { router, initJourneyDisplay, updateConfigFromPreferences, calculateJourney, getCurrentJourney, renderJourneyPNG, renderJourneyBase64 };
