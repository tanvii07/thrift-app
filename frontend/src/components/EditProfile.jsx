import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useNavigate } from "react-router-dom";

export default function EditProfile() {
  const [form, setForm] = useState({
    bio: "",
    location: "",
    profilePic: null,
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setForm((prev) => ({
          ...prev,
          bio: res.data.user.bio || "",
          location: res.data.user.location || "",
        }));
        setPreview(res.data.user.profilePic || null);
      } catch (err) {
        console.error("Failed to load profile:", err);
        alert("Couldn't load profile");
        navigate("/home");
      }
    };

    if (token) fetchData();
    else navigate("/auth");
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profilePic" && files.length > 0) {
      setForm({ ...form, profilePic: files[0] });
      setPreview(URL.createObjectURL(files[0]));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      if (form.bio) formData.append("bio", form.bio);
      if (form.location) formData.append("location", form.location);
      if (form.profilePic) formData.append("profilePic", form.profilePic);

      await axios.put(`${API_BASE_URL}/auth/update-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Profile updated!");
      navigate("/profile");
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center relative">
      {/* ← Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="block absolute top-4 left-4 text-white text-xl z-50 p-2 bg-black bg-opacity-60 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-pink-400"
        style={{ textShadow: "0 0 6px rgba(255, 255, 255, 0.4)" }}
        aria-label="Go Back"
      >
        ←
      </button>

      <h2 className="text-3xl font-bold mb-6 text-center tracking-wide">Edit Profile</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white/5 backdrop-blur-md p-6 rounded-xl w-full max-w-md space-y-4 shadow-xl border border-white/10"
        encType="multipart/form-data"
      >
        {preview && (
          <img
            src={preview}
            alt="Profile preview"
            className="w-24 h-24 object-cover rounded-full mx-auto mb-4 border-2 border-white/30 shadow"
          />
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-300">Profile Picture</label>
          <input
            type="file"
            name="profilePic"
            accept="image/*"
            onChange={handleChange}
            className="block w-full text-sm text-gray-300"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-300">Bio</label>
          <input
            type="text"
            name="bio"
            value={form.bio}
            placeholder="Your bio"
            onChange={handleChange}
            className="w-full bg-gray-800 text-white p-2 rounded outline-none focus:ring-2 ring-white/20 transition"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-300">Location</label>
          <input
            type="text"
            name="location"
            value={form.location}
            placeholder="Your location"
            onChange={handleChange}
            className="w-full bg-gray-800 text-white p-2 rounded outline-none focus:ring-2 ring-white/20 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 transition ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
