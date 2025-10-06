import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config";
import { useToast } from "./ToastProvider";

export default function PostForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    caption: "",
    isThrift: false,
    tags: "",
    image: null,
    category: "others",
  });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "image") {
      const file = e.target.files[0];
      if (!file) return;

      setForm((prev) => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
    } else {
      setForm({
        ...form,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.image) return toast("Please upload an image");
    if (!form.caption || form.caption.trim() === "")
      return toast("Caption is required");

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("image", form.image);
    formData.append("caption", form.caption);
    formData.append("isThrift", form.isThrift);
    formData.append("tags", form.tags);
    formData.append("category", form.category);

    try {
      setUploading(true);
      const res = await axios.post(`${API_BASE_URL}/posts/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast("Post uploaded!");
      console.log(res.data);
      setForm({ caption: "", isThrift: false, tags: "", image: null, category: "others" });
      setPreview(null);
    } catch (err) {
      console.error(err);
      toast("Failed to upload post.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-black text-white p-6 rounded-xl shadow-md space-y-4 max-w-md mx-auto mt-8"
    >
      {/* ← Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="block absolute top-4 left-4 text-white text-xl z-50 p-2 bg-black bg-opacity-60 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-pink-400"
        style={{ textShadow: "0 0 6px rgba(255, 255, 255, 0.4)" }}
        aria-label="Go Back"
      >
        ←
      </button>

      <h2 className="text-xl font-bold">📸 Post a Picture</h2>

      <input
        type="file"
        name="image"
        accept="image/*"
        onChange={handleChange}
        className="block"
        required
      />

      {preview && (
        <div className="w-full aspect-[3/4] overflow-hidden rounded-lg">
          <img
            src={preview}
            alt="preview"
            className="w-full h-full object-cover border border-gray-300"
          />
        </div>
      )}

      <input
        type="text"
        name="caption"
        placeholder="Write a caption..."
        value={form.caption}
        onChange={handleChange}
        className="w-full border rounded p-2 bg-white text-black placeholder-gray-500"
        autoComplete="off"
        required
      />

      <label className="block text-sm">Category</label>
      <select
        name="category"
        value={form.category}
        onChange={handleChange}
        className="w-full border rounded p-2 bg-white text-black"
      >
        <option value="tops">Tops</option>
        <option value="jeans_skirts">Jeans/Skirts</option>
        <option value="dresses">Dresses</option>
        <option value="others">Others</option>
      </select>

      <input
        type="text"
        name="tags"
        placeholder="Tags (comma separated)"
        value={form.tags}
        onChange={handleChange}
        className="w-full border rounded p-2 bg-white text-black placeholder-gray-500"
        autoComplete="off"
      />

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="isThrift"
          checked={form.isThrift}
          onChange={handleChange}
        />
        <span>Put this item up for thrift</span>
      </label>

      <button
        type="submit"
        disabled={uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
      >
        {uploading ? "Uploading..." : "Post"}
      </button>
    </form>
  );
}
