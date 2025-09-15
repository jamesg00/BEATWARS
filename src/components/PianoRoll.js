// src/components/PianoRoll.jsx
import React, { useMemo } from "react";

const NOTE_ORDER = [
  "C8","B7","A#7","A7","G#7","G7","F#7","F7","E7","D#7","D7","C#7",
  "C7","B6","A#6","A6","G#6","G6","F#6","F6","E6","D#6","D6","C#6",
  "C6","B5","A#5","A5","G#5","G5","F#5","F5","E5","D#5","D5","C#5",
  "C5","B4","A#4","A4","G#4","G4","F#4","F4","E4","D#4","D4","C#4",
  "C4","B3","A#3","A3","G#3","G3","F#3","F3","E3","D#3","D3","C#3","C3"
];

const rowOf = (note) => {
  const i = NOTE_ORDER.indexOf(note);
  return i >= 0 ? i : NOTE_ORDER.indexOf("C4");
};

function PianoRoll({ events = [], grid = 16, bars = 4, mode = "melody", opacity = 0.6 }) {
  const totalSteps = bars * grid;
  const width = 800, height = 220;
  const stepW = width / totalSteps;
  const rowH = height / NOTE_ORDER.length;

  const rects = useMemo(() => {
    if (mode === "drums") {
      return events.flatMap(ev => {
        const x = ev.startStep * stepW;
        const w = ev.lengthSteps * stepW;
        return ev.notes.map((_, idx) => ({ x, y: height - (idx+1)*10 - 5, w, h: 8 }));
      });
    }
    return events.filter(e => e.note).map(e => {
      const x = e.startStep * stepW;
      const w = e.lengthSteps * stepW;
      const y = rowOf(e.note) * rowH;
      return { x, y, w, h: rowH - 1 };
    });
  }, [events, grid, bars]);

  const beatLines = [];
  for (let s = 0; s <= totalSteps; s += grid / 4) beatLines.push(s);

  return (
    <div style={{ position: "relative", width, margin: "0 auto" }}>
      <svg width={width} height={height} style={{ opacity, borderRadius: 12, background: "linear-gradient(180deg,#f8f8ff,#ffffff)" }}>
        {beatLines.map((s, i) => (
          <line key={i} x1={s*stepW} y1={0} x2={s*stepW} y2={height}
                stroke={i % 4 === 0 ? "#ccc" : "#eee"} strokeWidth={i % 4 === 0 ? 1.5 : 1}/>
        ))}
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={3} ry={3} fill="#6c6cff" opacity="0.8" />
        ))}
      </svg>
    </div>
  );
}

export default PianoRoll;
