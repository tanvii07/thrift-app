import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config";
import Orb from "./Orb";
import "../styles/Orb.css";
import { useToast } from "./ToastProvider";

export default function Auth() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [mode, setMode] = useState(null); // null | 'login' | 'signup'
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      const endpoint = mode === "login" ? "login" : "register";
      const payload = mode === "login"
        ? { email: form.email.trim(), password: form.password }
        : { username: form.username.trim(), email: form.email.trim(), password: form.password };

      const res = await axios.post(`${API_BASE_URL}/auth/${endpoint}`, payload);
      localStorage.setItem("token", res.data.token);
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
      toast(`${mode === "register" ? "Signed up" : "Logged in"} successfully!`);
      navigate("/home");
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      if (status === 400 || status === 401) {
        toast(msg || "Invalid credentials");
      } else {
        toast(msg || "Something went wrong");
      }
    }
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Orb background, always centered and filling viewport */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0
      }}>
        <Orb />
      </div>

      {/* UI container, centered and above orb */}
      <div style={{
        position: "absolute",
        zIndex: 1,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none"
      }}>
        <div style={{ width: "100%", maxWidth: 520, padding: "0 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 style={{
          color: "white",
          fontSize: "clamp(1.75rem, 9.5vw, 6rem)",
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: "1.25rem",
          textAlign: "center",
          fontFamily: "libre baskerville"
        }}>yours, closet.</h1>

        {/* Welcome screen */}
        {!mode && (
          <div style={{ textAlign: "center" }}>
            <div className="auth-btn-row">
              <button
                className="login-auth-btn"
                style={{ pointerEvents: "auto" }}
                onClick={() => setMode("login")}
              >
                LOGIN
              </button>
              <button
                className="signup-auth-btn"
                style={{ pointerEvents: "auto" }}
                onClick={() => setMode("signup")}
              >
                SIGN UP
              </button>
            </div>
          </div>
        )}

        {/* Auth form screen */}
        {mode && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
              width: "90%",
              maxWidth: "350px",
              background: "none",
              boxShadow: "none",
              padding: 0
            }}
          >
            {/* Username only for signup */}
            {mode === "signup" && (
              <input
                name="username"
                value={form.username}
                placeholder="Enter Your Name"
                onChange={handleChange}
                className="auth-form-input"
                style={{ pointerEvents: "auto" }}
              />
            )}

            {/* Email field (both login & signup) */}
            <input
              name="email"
              type="email"
              value={form.email}
              placeholder="Enter Email"
              onChange={handleChange}
              className="auth-form-input"
              style={{ pointerEvents: "auto" }}
            />

            <input
              name="password"
              type="password"
              value={form.password}
              placeholder="Enter Password"
              onChange={handleChange}
              className="auth-form-input"
              style={{ pointerEvents: "auto" }}
            />

            <button
              type="submit"
              className={mode === "login" ? "login-auth-btn" : "signup-auth-btn"}
              style={{ margin: "1rem 0 0 0", width: "100%", pointerEvents: "auto" }}
            >
              {mode === "login" ? "LOGIN" : "SIGN UP"}
            </button>

            <button
              type="button"
              onClick={() => setMode(null)}
              style={{
                background: "none",
                color: "#fff",
                border: "none",
                padding: "0.7rem 2.2rem",
                fontSize: "1.5rem",
                marginTop: "0.3rem",
                cursor: "pointer",
                pointerEvents: "auto"
              }}
            >
              home
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
