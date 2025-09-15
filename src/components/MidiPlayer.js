// src/components/MidiPlayer.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";

function stepToSec(step, grid, tempo) {
  const secPerBeat = 60 / tempo;
  const stepsPerBeat = grid / 4; // bar=4 beats
  return step * (secPerBeat / stepsPerBeat);
}

export default function MidiPlayer({ mode = "melody", events = [], grid = 16, bars = 4, tempo = 110, samplerUrls = null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(null);

  useEffect(() => {
    return () => {
      if (synthRef.current) synthRef.current.dispose?.();
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  const setup = useCallback(async () => {
    await Tone.start();
    Tone.Transport.bpm.value = tempo;
    if (synthRef.current) synthRef.current.dispose?.();

    if (samplerUrls) {
      synthRef.current = new Tone.Sampler({ urls: samplerUrls, release: 1 }).toDestination();
    } else if (mode === "drums") {
      synthRef.current = new Tone.MembraneSynth().toDestination();
    } else {
      synthRef.current = new Tone.Synth().toDestination();
    }

    Tone.Transport.cancel();
    if (mode === "drums") {
      events.forEach(ev => {
        const t = stepToSec(ev.startStep, grid, tempo);
        Tone.Transport.schedule(time => {
          ev.notes.forEach(() => synthRef.current.triggerAttackRelease("C2", "16n", time));
        }, t);
      });
    } else {
      events.forEach(ev => {
        if (!ev.note) return;
        const t = stepToSec(ev.startStep, grid, tempo);
        const durSec = stepToSec(ev.startStep + ev.lengthSteps, grid, tempo) - t;
        Tone.Transport.schedule(time => {
          synthRef.current.triggerAttackRelease(ev.note, durSec, time, ev.velocity ?? 0.8);
        }, t);
      });
    }
  }, [events, grid, mode, samplerUrls, tempo]);

  const handlePlay = async () => {
    await setup();
    setIsPlaying(true);
    Tone.Transport.start("+0.05");
    const totalSteps = bars * grid;
    const totalDur = stepToSec(totalSteps, grid, tempo);
    setTimeout(() => {
      setIsPlaying(false);
      Tone.Transport.stop();
      Tone.Transport.cancel();
    }, (totalDur + 0.2) * 1000);
  };

  const handleStop = () => {
    setIsPlaying(false);
    Tone.Transport.stop();
    Tone.Transport.cancel();
  };

  return (
    <div className="flex gap-2">
      <button onClick={isPlaying ? handleStop : handlePlay}>
        {isPlaying ? "Stop" : "Play"}
      </button>
    </div>
  );
}
