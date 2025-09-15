// src/Home.js
import React, { useEffect, useMemo, useState } from "react";
import fireVideo from "./Fire_30___45s___4k_res.mp4";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

// OPTIONAL image for the tab icon (add a file at src/assets/tab-upload.png or remove this import)
// import uploadIcon from "./assets/tab-upload.png";

/**
 * Home: shows background video and prompts the user to pick a producer username
 * (alphanumeric + underscore, 3–20 chars) and optional bio.
 *
 * This version keeps ALL your original logic, and adds a top tab bar
 * with a first tab: "Upload Tracks" that opens a new website in a new tab.
 */
export default function Home() {
  const { user, logout, getAccessTokenSilently, isAuthenticated } = useAuth0();

  const [producerName, setProducerName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [hasProfile, setHasProfile] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const usernameRe = useMemo(() => /^[a-zA-Z0-9_]{3,20}$/, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Try to get an API token (works if you've created an Auth0 API with identifier https://beatwars.api)
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://beatwars.api" },
        }).catch(() => null);

        if (!mounted) return;
        setHasToken(!!token);

        if (token) {
          // Load profile from your backend
          const res = await fetch("http://localhost:4000/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const me = await res.json();
            if (me?.producerName) {
              setProducerName(me.producerName);
              setBio(me.bio || "");
              setHasProfile(true);
            }
          } else {
            setInfo("Connected to API but /me returned an error. You can still set your username below.");
          }
        } else {
          // Fallback to local storage if no token / no API yet
          const raw = localStorage.getItem("beatwars_profile");
          if (raw) {
            try {
              const local = JSON.parse(raw);
              if (local.producerName) {
                setProducerName(local.producerName);
                setBio(local.bio || "");
                setHasProfile(true);
              }
            } catch {}
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getAccessTokenSilently]);

  const navigate = useNavigate();
  const goUpload = () => navigate("/upload");

  const goFight = () => navigate("/fight");
  const goRank = () => navigate("/rank");

  const save = async () => {
    setError("");
    setInfo("");

    if (!usernameRe.test(producerName)) {
      setError("Username must be 3–20 chars: letters, numbers, underscore.");
      return;
    }

    setSaving(true);
    try {
      if (hasToken) {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://beatwars.api" },
        });
        const resp = await fetch("http://localhost:4000/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ producerName, bio }),
        });

        if (resp.ok) {
          setHasProfile(true);
          setInfo("Profile saved. Welcome!");
        } else if (resp.status === 409) {
          const j = await resp.json().catch(() => ({}));
          setError(j.message || "That producer name is taken.");
        } else if (resp.status === 400) {
          const j = await resp.json().catch(() => ({}));
          setError(j.message || "Invalid input.");
        } else {
          setError("Could not save profile (server error).");
        }
      } else {
        // Local fallback
        localStorage.setItem(
          "beatwars_profile",
          JSON.stringify({ producerName, bio })
        );
        setHasProfile(true);
        setInfo("Saved locally. Add your backend later for persistence.");
      }
    } catch (e) {
      setError("Unexpected error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const logoutNow = () =>
    logout({ logoutParams: { returnTo: window.location.origin } });

  // NEW: Tab click handlers
  const goHome = () => {
    // You are already on Home; could scroll to top or no-op
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  return (
    <div className="login-wrap">
      {/* Background video */}
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
        <button type="button" className="tab active" role="tab" aria-selected="true" onClick={goRank}>
          {/* Optional icon */}
          {/* <img src={homeIcon} alt="" className="tab-icon" /> */}
          <span>Leaderboard</span>
        </button>

        <button type="button" className="tab" role="tab" aria-selected="true" onClick={goFight}>
          {/* Optional icon */}
          {/* <img src={homeIcon} alt="" className="tab-icon" /> */}
          <span>1v1</span>
        </button>


        <button type="button" className="tab" role="tab" aria-selected="false" onClick={goUpload}>
          {/* Optional icon shown if you import one */}
          {/* {uploadIcon && <img src={uploadIcon} alt="" className="tab-icon" />} */}
          <span>Upload Tracks</span>
        </button>

        <button type="button" className="tab" role="tab" aria-selected="false" onClick={goUpload}>
          <span>Logout</span>
        
        </button>
        {/** Add more tabs later here (same pattern) */}
      </nav>

      <div className="auth-form-container">
        {loading ? (
          <div>Loading…</div>
        ) : hasProfile ? (
          <div>
            <h2>Welcome{producerName ? `, ${producerName}` : "!"}</h2>
            {bio && <p style={{ opacity: 0.85, marginTop: 8 }}>{bio}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="primary-btn" onClick={() => setHasProfile(false)}>
                Edit Profile
              </button>
              <button className="link-btn" onClick={logoutNow}>Logout</button>
            </div>
            {info && <p className="error" style={{ color: "#cfe9ff" }}>{info}</p>}
          </div>
        ) : (
          <div>
            <h2>Create your username</h2>
            <p style={{ opacity: 0.85, marginBottom: 12 }}>
              Pick your <strong>producer name</strong>. This is public and can differ from your real name.
            </p>

            <label htmlFor="producerName">Producer name</label>
            <input
              id="producerName"
              type="text"
              placeholder="e.g. beatwizard_88"
              value={producerName}
              onChange={(e) => setProducerName(e.target.value.trim())}
              autoComplete="off"
            />

            <label htmlFor="bio" style={{ marginTop: 10 }}>Bio (optional)</label>
            <textarea
              id="bio"
              placeholder="Tell the world about you (real name optional)."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />

            {error && <p className="error" role="alert">{error}</p>}
            {info && !error && <p style={{ color: "#cfe9ff" }}>{info}</p>}

            <button className="primary-btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="primary-btn" onClick={logoutNow}>Logout</button>
          </div>
        )}
      </div>
    </div>
  );
}
