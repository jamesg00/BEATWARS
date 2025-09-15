// src/midigen-core.js
// npm i @tonaljs/scale midi-writer-js
import * as Scale from '@tonaljs/scale';
import MidiWriter from 'midi-writer-js';

/* ------------------- shared utils ------------------- */

function rngFromSeed(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// rotate array left by k (for inversions)
function rotate(arr, k = 0) {
  const n = arr.length; const r = ((k % n) + n) % n;
  return arr.slice(r).concat(arr.slice(0, r));
}

// build EXACTLY 3 notes (triad) at target octave with chosen inversion
function triadVoicing(pcs, inversion = 0, targetOctave = 4) {
  // pcs expected like ['A','C#','E'] (root, 3rd, 5th)
  const triad = rotate(pcs.slice(0, 3), inversion); // root/1st/2nd inversion
  return triad.map(pc => `${pc}${targetOctave}`);
}


function weightedChoice(rng, items) {
  const total = items.reduce((s, x) => s + x.w, 0);
  let roll = rng() * total;
  for (const x of items) { if ((roll -= x.w) <= 0) return x.v; }
  return items[items.length - 1].v;
}

function durationFromSteps(stepsPerBar) {
  if (stepsPerBar === 4) return '4';
  if (stepsPerBar === 16) return '16';
  return '8';
}

const ROMAN = ['I','II','III','IV','V','VI','VII'];

const stripOct = (n) => n.replace(/[0-9]/g, '');

/* Build a diatonic pool across [lowOct..highOct] and ALWAYS include the top tonic. */
function buildDiatonicPool(key, scaleName, lowOct, highOct) {
  const info = Scale.get(`${key} ${scaleName}`);
  const pcs = info?.notes || [];
  if (pcs.length < 5) throw new Error(`Unknown scale: ${key} ${scaleName}`);
  const lo = Math.min(lowOct, highOct);
  const hi = Math.max(lowOct, highOct);
  const pool = [];
  for (let o = lo; o <= hi; o++) for (const pc of pcs) pool.push(`${pc}${o}`);
  pool.push(`${pcs[0]}${hi + 1}`); // top tonic for cadence
  return pool;
}

// EDM-friendly voicing (root-doubled triad, optional 7th), centered near targetOctave
function voiceChordEDM(pcs, { targetOctave = 4, addSeventh = false, power = true }) {
  // pcs is an array like ['A','C#','E',(maybe 'G')]
  const root = pcs[0], third = pcs[1], fifth = pcs[2], seventh = pcs[3];
  const out = [];
  // low power root (bass reinforcement)
  if (power) out.push(`${root}${targetOctave-1}`);
  // closed triad around target
  out.push(`${root}${targetOctave}`, `${third}${targetOctave}`, `${fifth}${targetOctave}`);
  // double the root on top for brightness
  out.push(`${root}${targetOctave+1}`);
  // optional 7th
  if (addSeventh && seventh) out.push(`${seventh}${targetOctave}`);
  return out;
}


// roman parser -> diatonic chord pitch classes
function parseRoman(rn) {
  const s = rn.trim(); const up = s.toUpperCase();
  const has7 = /7/.test(s);
  const core = up.replace(/7|°|M|MAJ/g, '');
  const idx = Math.max(0, ROMAN.indexOf(core));
  return { degree: idx, seventh: has7 };
}
function chordPCsFromRoman(scalePC7, rn) {
  const { degree, seventh } = parseRoman(rn);
  const n = scalePC7.length;
  const pcs = new Set([
    stripOct(scalePC7[degree % n]),
    stripOct(scalePC7[(degree + 2) % n]),
    stripOct(scalePC7[(degree + 4) % n]),
  ]);
  if (seventh) pcs.add(stripOct(scalePC7[(degree + 6) % n]));
  return pcs;
}

/* ------------------- MELODY MODE ------------------- */

export function generateMelody({
  key = 'A',
  scale = 'melodic minor',
  octaves = [4, 6],
  bars = 8,
  stepsPerBar = 8,     // 8 = eighths, 16 = sixteenths (if you add variable rhythm later)
  tempo = 110,
  contour = 'arch',
  intervalWeights = { repeat: 0.12, step: 0.76, leapS: 0.10, leapL: 0.02 },
  leapResolutionBoost = 0.65,
  melodicMinorDirectional = true,
  seed = 7,
  romanProgression = ['I','V','vi','IV'],
  chordBias = 0.55,
  approachBias = 0.25,
} = {}) {
  const rng = rngFromSeed(seed);

  const poolAsc = buildDiatonicPool(key, scale, octaves[0], octaves[1]);
  const poolDesc = (melodicMinorDirectional && /melodic minor/i.test(scale))
    ? buildDiatonicPool(key, 'natural minor', octaves[0], octaves[1])
    : poolAsc;

  const info = Scale.get(`${key} ${scale}`);
  const scalePC7 = (info?.notes || []).map(stripOct);
  if (scalePC7.length < 5) throw new Error(`Unknown scale: ${key} ${scale}`);

  // start near tonic midrange
  const startOct = Math.floor((octaves[0] + octaves[1]) / 2);
  let pool = poolAsc;
  let idx = pool.indexOf(`${key}${startOct}`);
  if (idx < 0) idx = Math.floor(pool.length / 2);
  let lastMove = 0;

  const steps = bars * stepsPerBar;
  const tempoTrack = new MidiWriter.Track(); tempoTrack.setTempo(tempo);
  const melody = new MidiWriter.Track();
  melody.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
  const dur = stepsPerBar === 16 ? '16' : stepsPerBar === 4 ? '4' : '8';

  const upBiasForPhase = (phase) => {
    switch (contour) {
      case 'up': return 0.65;
      case 'down': return 0.35;
      case 'arch': return phase < 0.5 ? 0.65 : 0.35;
      case 'inverse-arch': return phase < 0.5 ? 0.35 : 0.65;
      default: return 0.5;
    }
  };

  const chordPCsPerBar = (romanProgression || []).map(rn => chordPCsFromRoman(scalePC7, rn));
  const events = [];

  for (let i = 0; i < steps; i++) {
    const phase = i / steps;
    const upBias = upBiasForPhase(phase);

    const base = [
      { v: 0,  w: intervalWeights.repeat },
      { v: +1, w: intervalWeights.step * upBias },
      { v: -1, w: intervalWeights.step * (1 - upBias) },
      { v: +2, w: intervalWeights.leapS * upBias },
      { v: -2, w: intervalWeights.leapS * (1 - upBias) },
      { v: +3, w: intervalWeights.leapL * upBias },
      { v: -3, w: intervalWeights.leapL * (1 - upBias) },
    ];

    // resolve big leaps by stepping back
    if (Math.abs(lastMove) >= 3) {
      const dir = Math.sign(lastMove);
      base.push({ v: -dir, w: leapResolutionBoost });
    }

    // reduce triple repeats
    const lastTwoRepeat = (events.length >= 2) &&
      events[events.length-1].note === pool[idx] &&
      events[events.length-2].note === pool[idx];
    if (lastTwoRepeat) {
      const r = base.find(x => x.v === 0);
      if (r) r.w *= 0.4;
    }

    // relax in the last bar
    const inLastBar = Math.floor(i / stepsPerBar) === (bars - 1);
    if (inLastBar) base.forEach(x => { if (Math.abs(x.v) >= 2) x.w *= 0.7; });

    // chord gravity
    const strong = (i % stepsPerBar === 0) || (i % (stepsPerBar / 2) === 0);
    const barIdx = Math.floor(i / stepsPerBar);
    const chordPCs = chordPCsPerBar[barIdx] || new Set();

    const weighted = base.map((cand) => {
      let w = cand.w;
      let next = idx + cand.v;
      if (next < 0 || next >= pool.length) next = idx - cand.v;

      const moveDir = Math.sign(next - idx);
      pool = (melodicMinorDirectional && moveDir < 0) ? poolDesc : poolAsc;
      next = Math.max(0, Math.min(pool.length - 1, next));

      const pc = stripOct(pool[next]);
      if (strong && chordPCs.has(pc)) w *= (1 + chordBias);
      else if (!strong && chordPCs.size && Math.abs(cand.v) === 1) {
        const lookahead = Math.max(0, Math.min(pool.length - 1, next + Math.sign(cand.v)));
        const laPC = stripOct(pool[lookahead]);
        if (chordPCs.has(laPC)) w *= (1 + approachBias);
      }
      return { v: next - idx, w };
    });

    const move = weightedChoice(rng, weighted);
    idx = Math.max(0, Math.min(pool.length - 1, idx + move));
    lastMove = move;

    const noteName = pool[idx];
    melody.addEvent(new MidiWriter.NoteEvent({ pitch: [noteName], duration: dur, velocity: 72 }));
    events.push({ type: 'note', note: noteName, startStep: i, lengthSteps: 1, velocity: 0.72 });
  }

  // cadence: snap last to tonic in-place (same octave)
  const lastName = pool[idx];
  const lastOct = lastName.replace(/^[A-G]#?/, '');
  const tonicHere = `${key}${lastOct}`;
  if (tonicHere !== lastName) {
    const lastEvt = melody.data[melody.data.length - 1];
    if (lastEvt && lastEvt.type === 8) lastEvt.data[0].pitch = [tonicHere];
    const lastVis = events[events.length - 1]; if (lastVis) lastVis.note = tonicHere;
  }

  const writer = new MidiWriter.Writer([tempoTrack, melody]);
  return { dataUri: writer.dataUri(), events, meta: { mode: 'melody', key, scale, bars, stepsPerBar, tempo, romanProgression } };
}

/* ------------------- DRUMS MODE ------------------- */

function euclidPattern(steps, pulses, rotation = 0) {
  const out = Array(steps).fill(false);
  if (pulses <= 0) return out;
  for (let i = 0; i < pulses; i++) {
    const pos = Math.floor((i * steps) / pulses);
    out[(pos + rotation) % steps] = true;
  }
  return out;
}

export function generateDrums({
  bars = 4,
  stepsPerBar = 16,
  tempo = 120,
  style = 'house',
  density = 0.7,
  seed = 3,
} = {}) {
  const steps = bars * stepsPerBar;
  const presets = {
    house: {
      kick:  { pulses: 4, rotation: 0 },
      snare: { pulses: 2, rotation: stepsPerBar / 2 },
      hat:   { pulses: Math.round(stepsPerBar * density / 2), rotation: 0, openEvery: 8 },
    },
    hiphop: {
      kick:  { pulses: Math.max(2, Math.round(3 * density)), rotation: 0 },
      snare: { pulses: 2, rotation: stepsPerBar / 2 },
      hat:   { pulses: Math.round(stepsPerBar * (0.5 + 0.5 * density) / 2), rotation: 0, openEvery: 12 },
    }
  };
  const cfg = presets[style] || presets.hiphop;

  const kick  = euclidPattern(steps, cfg.kick.pulses,  cfg.kick.rotation);
  const snare = euclidPattern(steps, cfg.snare.pulses, cfg.snare.rotation);
  const hat   = euclidPattern(steps, cfg.hat.pulses,   cfg.hat.rotation);

  const GM = { K: 36, S: 38, Hc: 42, Ho: 46 };
  const isDownbeat = (i) => (i % stepsPerBar) === 0;

  const tempoTrack = new MidiWriter.Track(); tempoTrack.setTempo(tempo);
  const drums = new MidiWriter.Track();
  const events = [];
  const dur = durationFromSteps(stepsPerBar);

  let isFirst = true;
  for (let i = 0; i < steps; i++) {
    const notes = [];
    const vel = {};
    if (kick[i])  { notes.push(GM.K); vel[GM.K]  = 90; }
    if (snare[i]) { notes.push(GM.S); vel[GM.S] = 95; }
    if (hat[i])   {
      const open = (cfg.hat.openEvery && (i % cfg.hat.openEvery === cfg.hat.openEvery - 1));
      const nn = open ? GM.Ho : GM.Hc;
      notes.push(nn);
      vel[nn] = isDownbeat(i) ? 80 : 70;
    }
    if (!notes.length) continue;

    drums.addEvent(new MidiWriter.NoteEvent({
      pitch: notes,
      duration: dur,
      velocity: Math.max(...notes.map(n => vel[n] || 70)),
      channel: 10,
      wait: isFirst ? 0 : undefined,
    }));
    isFirst = false;

    events.push({ type: 'drum', notes, startStep: i, lengthSteps: 1, velocities: vel });
  }

  const writer = new MidiWriter.Writer([tempoTrack, drums]);
  return { dataUri: writer.dataUri(), events, meta: { mode: 'drums', bars, stepsPerBar, tempo, style } };
}

/* ------------------- unified facade ------------------- */

export function generateChordTrackEDM({
  key = 'A',
  scale = 'major',
  bars = 8,
  stepsPerBar = 8,
  tempo = 128,
  romanProgression = ['I','V','vi','IV'],
  pattern = 'block',        // 'block' | 'half' | 'arp8' | 'arp16' | 'stabs'
  addSeventh = false,       // ignored for stabs (triads only)
  targetOctave = 4,
  // === NEW for stabs ===
  stabRate = 8,             // 8 -> eighth-note grid, 16 -> sixteenth-note grid
  stabRhythm = null,        // array of 0/1 length = stabRate (per bar)
  inversionCycle = 'root',  // 'root' | '1st' | '2nd' | 'cycle'
} = {}) {
  const info = Scale.get(`${key} ${scale}`);
  const scalePC7 = (info?.notes || []).map(stripOct);
  if (scalePC7.length < 5) throw new Error(`Unknown scale: ${key} ${scale}`);

  // chord PCs per bar
  const chordPCsPerBar = (romanProgression || []).map(rn => {
    const pcsSet = chordPCsFromRoman(scalePC7, rn);
    const pcs = Array.from(pcsSet);  // [root, third, fifth, (maybe 7th)]
    // force triad head for stabs
    if (pcs.length > 3) pcs.length = 3;
    return pcs;
  });

  const tempoTrack = new MidiWriter.Track(); tempoTrack.setTempo(tempo);
  const chordsTrack = new MidiWriter.Track();
  chordsTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));

  const events = [];
  const noteDur = stepsPerBar === 16 ? '16' : stepsPerBar === 4 ? '4' : '8';

  // --- existing helpers for block/arp ---
  const addBlock = (barIdx, startStep, lengthSteps) => {
    const pcs = chordPCsPerBar[barIdx % chordPCsPerBar.length] || [];
    // for block we can do a fuller EDM voicing (root double etc.)
    const root = pcs[0], third = pcs[1], fifth = pcs[2];
    const voicing = [`${root}${targetOctave-1}`, `${root}${targetOctave}`, `${third}${targetOctave}`, `${fifth}${targetOctave}`, `${root}${targetOctave+1}`];
    chordsTrack.addEvent(new MidiWriter.NoteEvent({
      pitch: voicing,
      duration: lengthSteps >= stepsPerBar ? (noteDur === '16' ? '2' : '1') : noteDur,
      velocity: 78,
      wait: events.length === 0 ? 0 : undefined,
    }));
    events.push({ type: 'chord', notes: voicing, startStep, lengthSteps });
  };

  const addArp = (barIdx, startStep, gridDiv) => {
    const pcs = chordPCsPerBar[barIdx % chordPCsPerBar.length] || [];
    const root = pcs[0], third = pcs[1], fifth = pcs[2];
    const voicing = [`${root}${targetOctave}`, `${third}${targetOctave}`, `${fifth}${targetOctave}`, `${root}${targetOctave+1}`];
    const stepLen = Math.max(1, Math.floor(stepsPerBar / gridDiv));
    for (let k = 0; k < gridDiv; k++) {
      const pitch = [voicing[k % voicing.length]];
      chordsTrack.addEvent(new MidiWriter.NoteEvent({
        pitch, duration: noteDur, velocity: 72,
        wait: (events.length === 0 && k === 0) ? 0 : undefined,
      }));
      events.push({ type: 'chord-arp', notes: pitch, startStep: startStep + k*stepLen, lengthSteps: stepLen });
    }
  };

  // --- NEW: stabs (3-note triads on 8ths/16ths with rhythm pattern) ---
  const DEFAULT_RHYTHMS = {
    // Deadmau5-style offbeat: 8ths: hits on the "&" of each beat
    offbeat8:  [0,1, 0,1, 0,1, 0,1],
    // Deadmau5-ish 16ths: place on the 3rd sixteenth of each beat
    offbeat16: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    // Skrillex-y syncopation (busier 16th pattern)
    sync16:    [1,0,1,0, 0,1,0,1, 1,0,0,1, 0,1,1,0],
  };

  function getDefaultRhythm(rate) {
    if (stabRhythm && stabRhythm.length === rate) return stabRhythm;
    if (rate === 8)  return DEFAULT_RHYTHMS.offbeat8;
    if (rate === 16) return DEFAULT_RHYTHMS.offbeat16;
    // fallback: all hits
    return Array.from({length: rate}, () => 1);
  }

  const doStabs = (barIdx, startStep) => {
    const pcs = chordPCsPerBar[barIdx % chordPCsPerBar.length] || [];
    const rate = (stabRate === 16) ? 16 : 8; // sanitize
    const rhythm = getDefaultRhythm(rate);
    const subStep = Math.max(1, Math.floor(stepsPerBar / rate));

    // decide inversion for this bar
    let inv = 0;
    if (inversionCycle === '1st') inv = 1;
    else if (inversionCycle === '2nd') inv = 2;
    else if (inversionCycle === 'cycle') inv = barIdx % 3; // root -> 1st -> 2nd -> ...

    for (let k = 0; k < rate; k++) {
      if (!rhythm[k]) continue;
      const triad = triadVoicing(pcs, inv, targetOctave); // EXACTLY 3 notes
      chordsTrack.addEvent(new MidiWriter.NoteEvent({
        pitch: triad,
        duration: subStep >= (stepsPerBar/16) ? (rate===16 ? '16' : '8') : noteDur,
        velocity: 90,
        wait: (events.length === 0 && k === 0) ? 0 : undefined,
      }));
      events.push({
        type: 'chord-stab',
        notes: triad,
        startStep: startStep + k * subStep,
        lengthSteps: subStep,
      });
    }
  };

  for (let bar = 0; bar < bars; bar++) {
    const start = bar * stepsPerBar;
    if (pattern === 'block') {
      addBlock(bar, start, stepsPerBar);
    } else if (pattern === 'half') {
      addBlock(bar, start, stepsPerBar/2);
      addBlock(bar, start + stepsPerBar/2, stepsPerBar/2);
    } else if (pattern === 'arp8') {
      addArp(bar, start, 8);
    } else if (pattern === 'arp16') {
      addArp(bar, start, 16);
    } else { // 'stabs'
      doStabs(bar, start);
    }
  }

  return { tempoTrack, chordsTrack, events };
}


export function generateMidi(opts = {}) {
  if (opts.mode === 'drums') return generateDrums(opts);

  const {
    includeChords = true,            // default ON for EDM
    chordPattern = 'block',          // 'block' | 'half' | 'arp8' | 'arp16'
    chordSeventh = false,
    chordOctave = 4,
  } = opts;

  // 1) generate melody (monophonic)
  const mel = generateMelody(opts);

  if (!includeChords) return mel;

  // 2) generate chords and stitch a single MIDI
  const chords = generateChordTrackEDM({
    key: opts.key, scale: opts.scale, bars: opts.bars, stepsPerBar: opts.stepsPerBar,
    tempo: opts.tempo,
    romanProgression: opts.romanProgression,
    pattern: chordPattern,
    addSeventh: chordSeventh,
    targetOctave: chordOctave,
  });

  // Rebuild a combined MIDI with tempo + chords + melody
  const melodyTrack = new MidiWriter.Track();
  melodyTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
  const noteDur = opts.stepsPerBar === 16 ? '16' : opts.stepsPerBar === 4 ? '4' : '8';
  mel.events.forEach(e => {
    if (e.type !== 'note') return;
    melodyTrack.addEvent(new MidiWriter.NoteEvent({ pitch: [e.note], duration: noteDur, velocity: 72 }));
  });

  const writer = new MidiWriter.Writer([chords.tempoTrack, chords.chordsTrack, melodyTrack]);

  // merge events for HUD (melody + chords)
  const events = [
    ...mel.events,
    ...chords.events.map(e => ({ ...e, chord: true })),
  ];

  return {
    dataUri: writer.dataUri(),
    events,
    meta: { ...(mel.meta || {}), includeChords, chordPattern, chordSeventh, chordOctave }
  };
}

