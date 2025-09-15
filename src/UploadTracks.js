import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import fireVideo from "./Fire_30___45s___4k_res.mp4";

const ACCEPTED = ["audio/mpeg", "audio/wav", "audio/x-wav"];
const MAX_MB = 50;
const KEYS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const MODES = ["Major","Minor"];
const MAX_QUEUE = 10;
const truncateWithParens = (s, max = 16) =>
  s.length > max ? `(${s.slice(0, max - 3)}...)` : `(${s})`;

export default function UploadTracks() {
  const navigate = useNavigate();

  // selection state (current file + metadata form)
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [bpm, setBpm] = useState("");
  const [keySig, setKeySig] = useState("C");
  const [mode, setMode] = useState("Major");
  const [description, setDescription] = useState("");

  // queue of uploaded (in-session) tracks
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState("");

  // NEW: drag-over highlight state (✅ inside component)
  const [isOver, setIsOver] = useState(false);

  // audio + player state
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const bpmValid = useMemo(() => {
    const n = Number(bpm);
    return Number.isFinite(n) && n >= 40 && n <= 300;
  }, [bpm]);

  // Restore queue on mount
  useEffect(() => {
    const raw = sessionStorage.getItem("upload_queue");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setQueue(parsed);
      } catch {}
    }
    const vol = sessionStorage.getItem("player_volume");
    if (vol) setVolume(Number(vol));
  }, []);

  // Persist queue & volume on change
  useEffect(() => {
    sessionStorage.setItem("upload_queue", JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    sessionStorage.setItem("player_volume", String(volume));
  }, [volume]);

  // Revoke URLs on real page exit (not on route change)
  useEffect(() => {
    const handler = () => {
      queue.forEach((t) => t.url && URL.revokeObjectURL(t.url));
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [queue]);

  // set audio volume initially and whenever volume state changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const goHome = () => navigate("/");
  const pickFile = () => document.getElementById("upload-audio-input")?.click();

  const validateFile = (f) => {
    if (!f) return "Please choose a file.";
    const isAccepted = ACCEPTED.includes(f.type) || /\.(wav|mp3)$/i.test(f.name);
    if (!isAccepted) return "Only .mp3 and .wav files are allowed.";
    if (f.size > MAX_MB * 1024 * 1024) return `Max file size is ${MAX_MB} MB.`;
    return "";
  };

  const handleFile = (f) => {
    const err = validateFile(f);
    setError(err);
    if (err) { setFile(null); return; }
    setFile(f);
    if (!name.trim()) setName(f.name.replace(/\.(mp3|wav)$/i, ""));
  };

  // ✅ define this (it was missing)
  const onInputChange = (e) => handleFile(e.target.files?.[0]);

  // Drag & drop visual handlers
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const addToQueue = () => {
    setError("");
    if (!file) return setError("Choose a file first.");
    if (!name.trim()) return setError("Please enter a track name.");
    if (!bpmValid) return setError("BPM must be a number between 40 and 300.");
    if (queue.length >= MAX_QUEUE) {
      return setError(`Queue is full (max ${MAX_QUEUE}). Remove one to add more.`);
    }
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const url = URL.createObjectURL(file);

    const item = {
      id, url,
      name: name.trim(),
      bpm: Number(bpm),
      key: keySig,
      mode,
      description: description.trim(),
      fileName: file.name,
      mime: file.type || "",
      size: file.size,
    };

    setQueue((q) => [item, ...q]);
    // reset form
    setFile(null); setName(""); setBpm(""); setKeySig("C"); setMode("Major"); setDescription("");
    const el = document.getElementById("upload-audio-input"); if (el) el.value = "";
  };

  const removeFromQueue = (id) => {
    setQueue((q) => {
      const item = q.find((t) => t.id === id);
      if (item) URL.revokeObjectURL(item.url);
      const next = q.filter((t) => t.id !== id);
      if (playingId === id && audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
        setCurrentTime(0);
      }
      return next;
    });
  };

  const play = (id) => {
    const item = queue.find((t) => t.id === id);
    if (!item || !audioRef.current) return;
    if (playingId === id) {
      if (!audioRef.current.paused) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
      return;
    }
    audioRef.current.src = item.url;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => setPlayingId(id)).catch(() => {});
  };

  const stop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setPlayingId(null);
    setCurrentTime(0);
  };

  // format time helper
  const formatTime = (s) => {
    if (!isFinite(s)) return "0:00";
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    const minTotal = Math.floor(s / 60);
    const hrs = Math.floor(minTotal / 60);
    const mins = (minTotal % 60).toString().padStart(2, "0");
    return hrs ? `${hrs}:${mins}:${sec}` : `${minTotal}:${sec}`;
  };

  // seek and volume handlers
  const onSeek = (e) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };
  const onVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const currentTrack = queue.find((t) => t.id === playingId);

  return (
    <div className="login-wrap">
      {/* Background video */}
      <video className="bg-video" autoPlay loop muted playsInline preload="metadata" aria-hidden="true">
        <source src={fireVideo} type="video/mp4" />
      </video>
      <div className="overlay" />

      {/* Tabs header */}
      <nav className="top-tabs" role="tablist" aria-label="Main tabs">
        <button type="button" className="tab" onClick={goHome}>
          <span>Back</span>
        </button>
        <span className="tab active"><span>Upload Tracks</span></span>
      </nav>

      {/* Content card */}
      <div className="auth-form-container">
        <h2>Upload Tracks</h2>
        <p style={{ opacity: 0.85, marginBottom: 12 }}>
          Drop an <strong>.mp3</strong> or <strong>.wav</strong>, then fill the details and add it to your queue.
        </p>

        {/* Dropzone */}
        <div
          className={`dropzone ${isOver ? "is-over" : ""}`}
          onClick={pickFile}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? pickFile() : null)}
          aria-label="Choose an audio file to upload (drag & drop supported)"
          aria-dropeffect="copy"
        >
          <input
            id="upload-audio-input"
            type="file"
            accept=".mp3,audio/mpeg,.wav,audio/wav,audio/x-wav"
            onChange={onInputChange}
            hidden
          />
          <div className="dz-inner">
            <div className="dz-icon">⬆️</div>
            <div className="dz-title">Drag & drop your beat here</div>
            <div className="dz-sub">MP3 or WAV · up to {MAX_MB}MB</div>
            <button
              type="button"
              className="primary-btn dz-button"
              onClick={(e) => { e.stopPropagation(); pickFile(); }}
            >
              Choose Beat
            </button>
          </div>
        </div>

        {/* Selected file + form */}
        {file && (
          <div className="file-card" style={{ marginBottom: 12 }}>
            <div className="file-name">{file.name}</div>
            <div className="file-meta">
              {(file.size / (1024 * 1024)).toFixed(1)} MB · {file.type || "audio"}
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="form-row">
                <label>Track Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Fire Beat" />
              </div>

              <div className="form-row">
                <label>BPM</label>
                <input
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  type="number"
                  min={40}
                  max={300}
                  placeholder="140"
                />
                {!bpmValid && bpm !== "" && (<small className="error">40–300 only</small>)}
              </div>

              <div className="form-row">
                <label>Key</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={keySig} onChange={(e) => setKeySig(e.target.value)}>
                    {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label>Description (optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vibe, instruments, notes, etc."
                />
              </div>
            </div>

            <div className="actions" style={{ marginTop: 12 }}>
              <button className="primary-btn" onClick={addToQueue} disabled={!bpmValid || !name.trim()}>
                Add to Queue
              </button>
              <button className="link-btn" onClick={() => setFile(null)}>Cancel</button>
            </div>
          </div>
        )}

        {error && <div className="error" role="alert" style={{ marginTop: 8 }}>{error}</div>}

        {/* Queue */}
        <h3 style={{ marginTop: 18 }}>Your Queue</h3>
        <div className="queue-wrap">
          {queue.length === 0 ? (
            <p style={{ opacity: 0.8 }}>No tracks yet. Add one above.</p>
          ) : (
            <ul className="queue-list">
              {queue.map((t, idx) => (
                <li key={t.id} className="queue-item">
                  <div className="num">{idx + 1}</div>

                  <div className="queue-left">
                    <div className="queue-title" title={t.name}>
                      {truncateWithParens(t.name, 18)}
                    </div>
                    <div className="queue-meta">
                      {t.bpm} BPM · {t.key} {t.mode}
                      {t.description ? ` · ${t.description}` : ""}
                    </div>
                  </div>

                  <div className="queue-actions">
                    <button className="primary-btn" onClick={() => play(t.id)}>
                      {playingId === t.id && audioRef.current && !audioRef.current.paused ? "Pause" : "Play"}
                    </button>
                    <button className="link-btn" onClick={() => removeFromQueue(t.id)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hidden audio element used for playback */}
        <audio
          ref={audioRef}
          onEnded={() => { setPlayingId(null); setCurrentTime(0); }}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        />
      </div>

      {/* MINI PLAYER — bottom-left overlay */}
      {playingId && currentTrack && (
        <div className="mini-player">
          <div className="np-title">
            Now playing: <strong>{currentTrack.name}</strong>
          </div>

          <div className="progress-row">
            <span className="time">{formatTime(currentTime)}</span>
            <input
              className="player-progress"
              type="range"
              min={0}
              max={duration || 0}
              step="0.01"
              value={Math.min(currentTime, duration || 0)}
              onChange={onSeek}
              aria-label="Seek"
            />
            <span className="time">{formatTime(duration)}</span>
          </div>

          <div className="controls-row">
            <label className="vol-label" htmlFor="vol">Volume</label>
            <input
              id="vol"
              className="volume-slider"
              type="range"
              min={0}
              max={1}
              step="0.01"
              value={volume}
              onChange={onVolume}
              aria-label="Volume"
            />
            <button className="link-btn" onClick={stop}>Stop</button>
          </div>
        </div>
      )}
    </div>
  );
}
