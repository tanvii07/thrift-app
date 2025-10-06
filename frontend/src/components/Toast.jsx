import React, { useEffect } from "react";

export default function Toast({ message, show, onClose, duration = 3000 }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 32,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#111",
      color: "#fff",
      padding: "12px 24px",
      borderRadius: 8,
      boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      zIndex: 9999,
      fontSize: 16,
      minWidth: 120,
      textAlign: "center",
      opacity: 0.97,
      pointerEvents: "auto"
    }}>
      {message}
    </div>
  );
}