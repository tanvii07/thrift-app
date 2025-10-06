import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useNavigate } from "react-router-dom";
import { Settings, Bell, Shirt } from "lucide-react";

export default function ProfilePage() {
  const [userPosts, setUserPosts] = useState([]);
  const [stats, setStats] = useState({});
  const [user, setUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  // Wardrobe drawer & builder
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [wardrobeLoading, setWardrobeLoading] = useState(false);
  const [wardrobeError, setWardrobeError] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderContext, setBuilderContext] = useState("");
  const [builderResult, setBuilderResult] = useState(null);
  const [builderLoading, setBuilderLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const statsRes = await axios.get(`${API_BASE_URL}/posts/profile/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(statsRes.data);

        const userInfoRes = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = userInfoRes.data.user;

        if (!userData || !userData._id) throw new Error("User ID not found");

        setUser(userData);

        const postsRes = await axios.get(`${API_BASE_URL}/posts/user/${userData._id}`);
        setUserPosts(postsRes.data);
      } catch (err) {
        console.error("Failed to load profile data:", err);
        alert("Couldn't load profile");
      }
    };

    if (token) fetchProfile();
    else navigate("/auth");
  }, [token, navigate]);

  useEffect(() => {
    if (showNotifications) {
      setNotifLoading(true);
      setNotifError("");
      axios.get(`${API_BASE_URL}/users/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          setNotifications(res.data);
          setNotifLoading(false);
        })
        .catch(err => {
          setNotifError("Failed to load notifications");
          setNotifLoading(false);
        });
    }
  }, [showNotifications, token]);

  useEffect(() => {
    if (showWardrobe) {
      setWardrobeLoading(true);
      setWardrobeError("");
      axios
        .get(`${API_BASE_URL}/wardrobe`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setWardrobeItems(res.data || []);
          setWardrobeLoading(false);
        })
        .catch(() => {
          setWardrobeError("Failed to load wardrobe");
          setWardrobeLoading(false);
        });
    }
  }, [showWardrobe, token]);

  const buildAIOutfit = async () => {
    try {
      setBuilderLoading(true);
      setBuilderResult(null);
      const res = await axios.post(
        `${API_BASE_URL}/ai/outfit`,
        { context: builderContext },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBuilderResult(res.data);
    } catch (err) {
      alert("Failed to build outfit");
    } finally {
      setBuilderLoading(false);
    }
  };

  // Accept/Decline thrift request
  const handleThriftAction = async (notif, action) => {
    if (!notif.post || !notif.fromUser) return;
    try {
      const postRes = await axios.get(`${API_BASE_URL}/posts/${notif.post._id}`);
      const reqs = postRes.data?.thriftRequests || [];
      let candidate = null;
      if (notif.requestId) {
        candidate = reqs.find((r) => (r._id === notif.requestId || (r._id?._id === notif.requestId)));
      }
      if (!candidate) {
        candidate = reqs.find(
          (r) => (r.requester?._id || r.requester) === (notif.fromUser?._id || notif.fromUser)
        );
      }
      if (!candidate || candidate.status !== 'pending') {
        alert('Request already processed or not found');
        return;
      }
      const url = `${API_BASE_URL}/posts/${notif.post._id}/thrift-request/${candidate._id}/${action}`;
      await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(`Thrift request ${action === 'accept' ? 'accepted' : 'declined'}`);
      setNotifLoading(true);
      axios.get(`${API_BASE_URL}/users/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          setNotifications(res.data);
          setNotifLoading(false);
        })
        .catch(() => setNotifLoading(false));
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} request`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-y-auto">
      {/* Notification Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="w-full max-w-xs h-full shadow-xl p-4 relative overflow-y-auto bg-pink-100 text-pink-900 border-l-4 border-pink-300">
            <button
              className="absolute top-2 right-2 text-xl"
              onClick={() => setShowNotifications(false)}
              aria-label="Close notifications"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-pink-700">Notifications</h2>
            {notifLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : notifError ? (
              <div className="text-red-500">{notifError}</div>
            ) : notifications.length === 0 ? (
              <div className="text-gray-500">No notifications</div>
            ) : (
              <ul className="space-y-3">
                {notifications.map((notif) => {
                  const isThrift = notif.type?.startsWith('thrift_');
                  const showActions =
                    notif.type === 'thrift_request' &&
                    notif.post &&
                    user &&
                    notif.post.author === user._id &&
                    (!notif.requestStatus || notif.requestStatus === 'pending');

                  const resolvedStatus = notif.requestStatus || (notif.type === 'thrift_accepted' ? 'accepted' : notif.type === 'thrift_declined' ? 'declined' : undefined);

                  return (
                    <li key={notif._id} className="border-b border-pink-200 pb-2">
                      <div className="font-medium">{notif.message}</div>
                      {isThrift && (
                        <div className="text-xs text-pink-700">
                          {resolvedStatus ? `Status: ${resolvedStatus}` : notif.type.replace('thrift_', '').replace(/_/g, ' ')}
                        </div>
                      )}
                      <div className="text-xs text-pink-600">{new Date(notif.createdAt).toLocaleString()}</div>

                      {showActions ? (
                        <div className="flex gap-2 mt-2">
                          <button
                            className="px-2 py-1 bg-pink-500 text-white rounded text-xs hover:bg-pink-600"
                            onClick={() => handleThriftAction(notif, 'accept')}
                          >
                            Accept
                          </button>
                          <button
                            className="px-2 py-1 bg-pink-200 text-pink-900 rounded text-xs hover:bg-pink-300"
                            onClick={() => handleThriftAction(notif, 'decline')}
                          >
                            Decline
                          </button>
                        </div>
                      ) : isThrift && resolvedStatus ? (
                        <div className="mt-2 text-xs font-semibold text-pink-800">
                          {resolvedStatus === 'accepted' ? 'Request accepted' : 'Request declined'}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
      {/* ← Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="block absolute top-4 left-4 text-white text-xl z-50 p-2 bg-black bg-opacity-60 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-pink-400"
        style={{ textShadow: "0 0 4px rgba(255, 255, 255, 0.4)" }}
        aria-label="Go Back"
      >
        ←
      </button>

      {/* Profile Info */}
      <div className="flex flex-col items-center space-y-4 mb-8 relative">
        {user?.profilePic ? (
          <img
            src={user.profilePic}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-2 border-white"
          />
        ) : (
          <div className="w-24 h-24 bg-gray-300 rounded-full" />
        )}

        <h2 className="text-3xl font-bold tracking-wide">@{user?.username}</h2>
        <p className="text-sm text-gray-400">{user?.bio}</p>
        {user?.location && (
          <p className="text-sm text-gray-500 italic">📍 {user.location}</p>
        )}

        {/* Settings & Notifications Icons */}
        {/* Desktop: absolute top-right */}
        <div className="hidden md:flex absolute top-4 right-4 z-10 gap-2">
          <button
            onClick={() => setShowNotifications(true)}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-pink-400 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Notifications"
          >
            <Bell size={28} />
          </button>
          <button
            onClick={() => setShowWardrobe(true)}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-pink-400 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Wardrobe"
            title="Wardrobe"
          >
            <Shirt size={28} />
          </button>
          <button
            onClick={() => navigate("/edit-profile", { replace: true })}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-gray-300 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Settings"
          >
            <Settings size={28} />
          </button>
        </div>
        {/* Mobile: centered row below avatar */}
        <div className="flex md:hidden gap-3 mt-2">
          <button
            onClick={() => setShowNotifications(true)}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-pink-400 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Notifications"
          >
            <Bell size={22} />
          </button>
          <button
            onClick={() => setShowWardrobe(true)}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-pink-400 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Wardrobe"
            title="Wardrobe"
          >
            <Shirt size={22} />
          </button>
          <button
            onClick={() => navigate("/edit-profile", { replace: true })}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-gray-300 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Settings"
          >
            <Settings size={22} />
          </button>
        </div>

        <div className="flex space-x-8 text-center mt-4">
          <div>
            <p className="text-lg font-semibold">{stats.totalPosts || 0}</p>
            <p className="text-sm text-gray-400">Posts</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{user?.followers?.length || 0}</p>
            <p className="text-sm text-gray-400">Followers</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{user?.following?.length || 0}</p>
            <p className="text-sm text-gray-400">Following</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.totalThrifts || 0}</p>
            <p className="text-sm text-gray-400">Thrifted</p>
          </div>
        </div>
      </div>

      {/* Posts Gallery */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {userPosts.map((post) => (
          <button
            key={post._id}
            onClick={() => setSelectedPost(post)}
            className="bg-white rounded-xl overflow-hidden shadow-md text-black flex flex-col text-left"
          >
            <div className="w-full aspect-[3/4] bg-gray-200">
              <img
                src={post.image}
                alt="post"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">{post.caption}</h3>
                <p className="text-sm text-gray-600">
                  {post.tags?.length ? `#${post.tags.join(" #")}` : ""}
                </p>
              </div>
              {post.isThrift && (
                <p className="text-xs mt-2 text-green-700 font-medium">
                  🛍️ Available for Thrift
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Modal Preview */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg overflow-hidden max-w-md w-full">
            <img src={selectedPost.image} alt="zoom" className="w-full object-cover" />
            <div className="p-4 text-black">
              <h3 className="font-bold text-lg mb-2">{selectedPost.caption}</h3>
              <p className="text-sm text-gray-700 mb-2">
                {selectedPost.tags?.length ? `#${selectedPost.tags.join(" #")}` : ""}
              </p>
              {selectedPost.isThrift && (
                <p className="text-xs text-green-700 font-medium">🛍️ Available for Thrift</p>
              )}
              {user && (selectedPost.author?._id === user._id || selectedPost.author === user._id) && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        await axios.delete(`${API_BASE_URL}/posts/${selectedPost._id}`, { headers: { Authorization: `Bearer ${token}` } });
                        setUserPosts((prev) => prev.filter((p) => p._id !== selectedPost._id));
                        setSelectedPost(null);
                        alert('Post deleted');
                      } catch {
                        alert('Failed to delete post');
                      }
                    }}
                    className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete Post
                  </button>
                </div>
              )}
              <button
                onClick={() => setSelectedPost(null)}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showWardrobe && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="w-full max-w-xs h-full shadow-xl p-4 relative overflow-y-auto bg-black text-white border-l border-gray-800">
            <button
              className="absolute top-2 right-2 text-xl"
              onClick={() => setShowWardrobe(false)}
              aria-label="Close wardrobe"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">Wardrobe</h2>
            {wardrobeLoading ? (
              <div className="text-gray-400">Loading...</div>
            ) : wardrobeError ? (
              <div className="text-red-400">{wardrobeError}</div>
            ) : (
              <div className="space-y-3">
                <button
                  className="w-full bg-pink-500 text-white py-2 rounded font-semibold hover:bg-pink-600"
                  onClick={() => setShowBuilder(true)}
                >
                  Build AI Outfit
                </button>
                {wardrobeItems.length === 0 ? (
                  <div className="text-gray-400">No items yet. Add from a post.</div>
                ) : (
                  <ul className="space-y-2">
                    {wardrobeItems.map((item) => (
                      <li key={item._id} className="flex items-center gap-3 border-b border-gray-800 pb-2">
                        {item.image ? (
                          <img src={item.image} alt="i" className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-800 rounded" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-400">{item.type}</div>
                        </div>
                        <button
                          className="ml-auto text-xs px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 text-white"
                          onClick={async () => {
                            try {
                              await axios.delete(`${API_BASE_URL}/wardrobe/${item._id}`, { headers: { Authorization: `Bearer ${token}` } });
                              setWardrobeItems((prev) => prev.filter((w) => w._id !== item._id));
                            } catch {
                              alert('Failed to remove');
                            }
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg overflow-hidden max-w-md w-full text-black p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">AI Outfit Builder</h3>
              <button className="text-xl" onClick={() => setShowBuilder(false)}>×</button>
            </div>
            <input
              type="text"
              value={builderContext}
              onChange={(e) => setBuilderContext(e.target.value)}
              placeholder="Context (e.g., rainy picnic)"
              className="w-full border rounded p-2 mb-3"
            />
            <button
              onClick={buildAIOutfit}
              disabled={builderLoading}
              className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
            >
              {builderLoading ? 'Building...' : 'Build'}
            </button>
            {builderResult && (
              <div className="mt-4">
                <div className="font-semibold mb-1">Suggested Outfit</div>
                <p className="text-sm mb-2">{builderResult.description}</p>
                {builderResult.items?.length > 0 && (
                  <ul className="list-disc pl-5 text-sm">
                    {builderResult.items.map((it, idx) => (
                      <li key={idx}>{it.type || 'item'} — {it.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
