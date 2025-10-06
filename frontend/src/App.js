import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import Auth from "./components/Auth";
import HomePage from "./components/HomePage";
import PostForm from "./components/PostForm";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfilePage from "./components/ProfilePage";
import EditProfile from "./components/EditProfile"; // ✅ Added missing import
import UserProfile from "./components/UserProfile";
import { ToastProvider } from "./components/ToastProvider";

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <div className="App">
          
          <Routes>
            {/* Public Auth Route */}
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-profile"
              element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/:userId"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/post"
              element={
                <ProtectedRoute>
                  <PostForm />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Auth />} />
          </Routes>
        </div>
      </ToastProvider>
    </Router>
  );
}
