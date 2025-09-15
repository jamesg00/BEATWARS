// src/MIDIGEN.jsx
import React, { useState } from "react";
import myImage from "./Logo.png";
import { generateMidi } from "./midi-gen-core"; // <- ensure file is named exactly this
import PianoRoll from "./components/PianoRoll";
import MidiPlayer from "./components/MidiPlayer";

/* --- Dropdown data --- */
const KEYS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const SCALES = [
  "major","natural minor","harmonic minor","melodic minor",
  "dorian","phrygian","lydian","mixolydian","locrian"
];
const EDM_PROGRESSIONS = {
  "EDM 1 (I–V–vi–IV)":   ["I","V","vi","IV"],
  "EDM 2 (vi–IV–I–V)":   ["vi","IV","I","V"],
  "EDM 3 (IV–I–V–vi)":   ["IV","I","V","vi"],
  "EDM 4 (I–iii–vi–IV)": ["I","iii","vi","IV"],
  "EDM 5 (vi–V–IV–V)":   ["vi","V","IV","V"],
  "EDM Minor (i–VI–III–VII)": ["i","VI","III","VII"],
};

export const MIDIGEN = () => {
  // Mode + transport
  const [mode, setMode] = useState("melody");
  const [bars, setBars] = useState(8);
  const [tempo, setTempo] = useState(128);
  const [grid, setGrid] = useState(16); // steps/bar for drums & roll display

  // Melody & chords params
  const [keySig, setKeySig] = useState("A");
  const [scale, setScale] = useState("major");
  const [progName, setProgName] = useState("EDM 1 (I–V–vi–IV)");
  const [addChords, setAddChords] = useState(true);
  const [chordPattern, setChordPattern] = useState("block"); // 'block' | 'half' | 'arp8' | 'arp16'
  const [add7th, setAdd7th] = useState(false);

  // Output
  const [result, setResult] = useState({ dataUri: null, events: [], meta: {} });

  const handleGenerate = () => {
    const out = generateMidi({
      mode,
      key: keySig,
      scale,
      octaves: [4,6],
      bars: Number(bars),
      stepsPerBar: mode === "drums" ? Number(grid) : 8,
      tempo: Number(tempo),
      seed: Date.now() & 0xffffffff,
      romanProgression: EDM_PROGRESSIONS[progName],
      includeChords: addChords,
      chordPattern,
      chordSeventh: add7th,
      chordOctave: 4,
    });
    setResult({
      ...out,
      meta: { ...(out.meta || {}), grid: Number(grid), bars: Number(bars), tempo: Number(tempo), mode }
    });
  };

  const shell = { maxWidth: 1100, margin: "0 auto", padding: 20, display: "grid", gap: 16 };
  const box = { border: "1px solid #eaeaf2", borderRadius: 16, padding: 16, background: "#fff" };

  return (
    <div className="MIDIGEN-container" style={shell}>
      {/* Header */}
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 12 }}>
        <img src={myImage} alt="Logo" style={{ width: 220, height: 88, objectFit: "contain" }} />
        <h2 style={{ margin: 0 }}>Welcome to MIDIGEN</h2>
      </div>

      {/* Controls grid (no piano roll here) */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(3, minmax(260px, 1fr))"
        }}
      >
        {/* Mode & Transport */}
        <div style={box}>
          <h3 style={{ marginTop: 0 }}>Mode & Transport</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setMode("melody")} disabled={mode === "melody"}>Melody</button>
            <button onClick={() => setMode("drums")} disabled={mode === "drums"}>Drums</button>
            <button onClick={handleGenerate} style={{ marginLeft: "auto" }}>Generate</button>
            {result?.dataUri && (
              <a href={result.dataUri} download={`${mode}_clip.mid`} style={{ textDecoration: "none" }}>
                ⬇️ Download MIDI
              </a>
            )}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Bars{" "}
              <input type="number" min={1} max={64} value={bars} onChange={e => setBars(e.target.value)} />
            </label>
            <label>
              Grid (steps/bar){" "}
              <input type="number" min={8} max={32} value={grid} onChange={e => setGrid(e.target.value)} />
            </label>
            <label>
              Tempo (BPM){" "}
              <input type="number" min={40} max={240} value={tempo} onChange={e => setTempo(e.target.value)} />
            </label>
          </div>
        </div>

        {/* Melody & Chords */}
        <div style={box}>
          <h3 style={{ marginTop: 0 }}>Melody — Key / Scale / Chords</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Key{" "}
              <select value={keySig} onChange={e => setKeySig(e.target.value)}>
                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label>
              Scale{" "}
              <select value={scale} onChange={e => setScale(e.target.value)}>
                {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Chord progression{" "}
              <select value={progName} onChange={e => setProgName(e.target.value)}>
                {Object.keys(EDM_PROGRESSIONS).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={addChords} onChange={(e)=>setAddChords(e.target.checked)} />
              Add chords
            </label>
            <label>
              Chord pattern{" "}
              <select value={chordPattern} onChange={(e)=>setChordPattern(e.target.value)}>
                <option value="block">Block (per bar)</option>
                <option value="half">Half-bar (2 per bar)</option>
                <option value="arp8">Arp (8 per bar)</option>
                <option value="arp16">Arp (16 per bar)</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={add7th} onChange={(e)=>setAdd7th(e.target.checked)} />
              Add 7th
            </label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Using: {EDM_PROGRESSIONS[progName].join(" | ")}
            </div>
          </div>
        </div>

        {/* Preview / Player */}
        <div style={box}>
          <h3 style={{ marginTop: 0 }}>Preview</h3>
          <MidiPlayer
            mode={result?.meta?.mode || mode}
            events={result?.events || []}
            grid={result?.meta?.grid || grid}
            bars={result?.meta?.bars || bars}
            tempo={result?.meta?.tempo || tempo}
          />
        </div>
      </div>

      {/* Piano roll — single instance, always at the bottom */}
      <div style={{ ...box }}>
        <h3 style={{ marginTop: 0 }}>Arrangement View</h3>
        {/* Make the roll scroll if it overflows horizontally */}
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <PianoRoll
            mode={result?.meta?.mode || mode}
            events={result?.events || []}
            grid={result?.meta?.grid || grid}
            bars={result?.meta?.bars || bars}
            opacity={1}
          />
        </div>
      </div>
    </div>
  );
};
