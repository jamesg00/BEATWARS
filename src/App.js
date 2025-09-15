import React, { useState } from "react";
import "./App.css";
import { Login } from "./Login";      // or: import Login from "./Login";
import { Register } from "./Register"; // or: import Register from "./Register";
import Home from "./Home";
import UploadTracks from "./UploadTracks";
import Fight from "./Fight";
import Rank from "./Rank";
import { useAuth0 } from "@auth0/auth0-react";
import { Routes, Route } from "react-router-dom";

export default function App() {
  const [currentForm, setCurrentForm] = useState("login");
  const { isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) {
    return (
      <div className="App" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  if (error) {
    return <div className="App" style={{ padding: 24 }}>Auth error: {error.message}</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadTracks />} />
          <Route path="/fight" element={<Fight />} />
          <Route path="/rank" element={<Rank/>} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="App">
      {currentForm === "login" ? (
        <Login onFormSwitch={setCurrentForm} />
      ) : (
        <Register onFormSwitch={setCurrentForm} />
      )}
    </div>
  );
}
