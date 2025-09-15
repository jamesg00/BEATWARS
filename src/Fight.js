// src/Fight.js
import React from "react";
import { useNavigate } from "react-router-dom";  



import fireVideo from "./Fire_30___45s___4k_res.mp4";

export default function Fight(){
  const navigate = useNavigate();

    // Go back to Home explicitly:
  const goHome = () => navigate("/");
  return (
    <div className="login-wrap">
      <video
        className="bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src={fireVideo} type="video/mp4" />
      </video>
      {/* Overlay for readability */}
      <div className="overlay" />

      {/* NEW: Top tabs bar (stays on top) */}
      <nav className="top-tabs" role="tablist" aria-label="Main tabs">
        <button type="button" className="tab active" role="tab" aria-selected="true" onClick={goHome}>
          {/* Optional icon */}
          {/* <img src={homeIcon} alt="" className="tab-icon" /> */}
          <span>Back</span>
        </button>

        {/** Add more tabs later here (same pattern) */}
      </nav>

      <div className="auth-form-container">
        <h2>1v1</h2>
        <p style={{ opacity: 0.85, marginTop: 8 }}>
          Starter page — we’ll add the actual uploader here next.
        </p>
      </div>
    </div>
  );
}
