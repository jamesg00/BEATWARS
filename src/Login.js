// src/Login.js
import React, { useState } from 'react';
import myImage from './Logo.png';
import fireVideo from './Fire_30___45s___4k_res.mp4';
import { useAuth0 } from '@auth0/auth0-react';

/**
 * Auth0-powered Login screen, keeping your original look & feel.
 *
 * We removed the local email/password submit (Auth0 handles it on the
 * Universal Login page). The two buttons now:
 *  - "Login" => loginWithRedirect()
 *  - "Create account" => loginWithRedirect({ screen_hint: 'signup' })
 */
export const Login = (props) => {
  const { loginWithRedirect, isLoading } = useAuth0();
  const [err, setErr] = useState('');

  const handleLogin = async () => {
    try {
      setErr('');
      await loginWithRedirect();
    } catch (e) {
      setErr('Could not start login. Please try again.');
      // console.error(e);
    }
  };

  const handleSignup = async () => {
    try {
      setErr('');
      await loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
    } catch (e) {
      setErr('Could not start signup. Please try again.');
      // console.error(e);
    }
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

      {/* Subtle overlay for readability */}
      <div className="overlay" />

      {/* Login card */}
      <div className="auth-form-container">
        <img
          src={myImage}
          className="Logo"
          alt="Logo"
          style={{ width: '250px', height: '100px', objectFit: 'contain' }}
        />
        <h2>Login</h2>

        {/* Auth0 actions */}
        <div className="login-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Loading…' : 'Login'}
          </button>

          <button
            type="button"
            className="link-btn"
            onClick={handleSignup}
            disabled={isLoading}
          >
            Create account
          </button>
        </div>

        {err && <p className="error" role="alert">{err}</p>}

        {/* Optional: keep legacy toggle if you still want to show your Register UI */}
        {props.onFormSwitch && (
          <button
            className="link-btn"
            type="button"
            onClick={() => props.onFormSwitch('register')}
          >
            Prefer the legacy form? Register Here
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;
