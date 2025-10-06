import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ToastProvider";
import { Bell, Shirt, MessageCircle } from "lucide-react";
import Chat from "./Chat";
import DeclineReasonModal from "./DeclineReasonModal";

export default function HomePage() {
  const [publicPosts, setPublicPosts] = useState([]);
  const [aiPosts, setAiPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  // Wardrobe drawer & AI builder
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [wardrobeLoading, setWardrobeLoading] = useState(false);
  const [wardrobeError, setWardrobeError] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderContext, setBuilderContext] = useState("");
  const [builderResult, setBuilderResult] = useState(null);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  // Chat functionality
  const [showChat, setShowChat] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const toast = useToast();

  // const combinedFeed = [...aiPosts, ...publicPosts].filter(
  //   (post, index, self) => self.findIndex((p) => p._id === post._id) === index
  // );

  const groups = {
    tops: publicPosts.filter(p => p.category === 'tops'),
    jeans_skirts: publicPosts.filter(p => p.category === 'jeans_skirts'),
    dresses: publicPosts.filter(p => p.category === 'dresses'),
    others: publicPosts.filter(p => !p.category || p.category === 'others'),
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCurrentUser(res.data.user);
      } catch (err) {
        console.error("Failed to fetch user info", err);
      }
    };
    if (token) fetchUser();
  }, [token]);

  useEffect(() => {
    const fetchAI = async () => {
      try {
        console.log("Fetching AI feed with token:", token ? "present" : "missing");
        const res = await axios.get(`${API_BASE_URL}/posts/feed-ai`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("AI feed response:", res.data);
        setAiPosts(res.data.suggestedPosts || []);
      } catch (err) {
        console.error("Failed to fetch AI feed:", err);
        console.error("Error details:", err.response?.data);
      }
    };
    if (token) fetchAI();
  }, [token]);

  useEffect(() => {
    const fetchPublicFeed = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/posts/feed`);
        // Backend returns { posts, grouped }, we need the posts array
        setPublicPosts(res.data.posts || []);
      } catch (err) {
        console.error("Failed to fetch public feed:", err);
      }
    };
    fetchPublicFeed();
  }, []);

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

  // Load wardrobe when drawer opens
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  const toggleLike = async (postId) => {
    if (!currentUser) {
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { liked } = res.data;

      setCurrentUser((prev) => ({
        ...prev,
        likedPosts: liked
          ? [...prev.likedPosts, postId]
          : prev.likedPosts.filter((id) => id !== postId),
      }));

      setPublicPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: liked
                  ? [...(post.likes || []), currentUser._id]
                  : post.likes.filter((id) => id !== currentUser._id)
              }
            : post
        )
      );

      setAiPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: liked
                  ? [...(post.likes || []), currentUser._id]
                  : post.likes.filter((id) => id !== currentUser._id)
              }
            : post
        )
      );
    } catch (err) {
      console.error("Like toggle failed:", err);
    }
  };

  const requestThrift = async (postId) => {
    if (!currentUser) {
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/posts/${postId}/thrift-request`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatePost = (posts) =>
        posts.map((post) =>
          post._id === postId
            ? {
                ...post,
                thriftRequests: [
                  ...(post.thriftRequests || []),
                  {
                    requester: currentUser._id,
                    requestDate: new Date(),
                    status: 'pending'
                  }
                ]
              }
            : post
        );

      setPublicPosts(updatePost);
      setAiPosts(updatePost);

      if (selectedPost && selectedPost._id === postId) {
        setSelectedPost(prev => ({
          ...prev,
          thriftRequests: [
            ...(prev.thriftRequests || []),
            {
              requester: currentUser._id,
              requestDate: new Date(),
              status: 'pending'
            }
          ]
        }));
      }

      toast("Thrift request sent successfully! The seller will be notified.");
    } catch (err) {
      console.error("Thrift request failed:", err);
      if (err.response?.data?.error) {
        toast(err.response.data.error);
      } else {
        toast("Failed to send thrift request");
      }
    }
  };

  const addToWardrobe = async (post) => {
    if (!token) {
      toast("Please log in");
      return;
    }
    try {
      const firstTag = Array.isArray(post.tags) && post.tags.length > 0 ? String(post.tags[0]).replace(/^#/, "") : "other";
      const res = await axios.post(
        `${API_BASE_URL}/wardrobe`,
        {
          name: post.caption || "Untitled",
          type: firstTag || "other",
          image: post.image,
          postId: post._id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast("Added to wardrobe");
      setWardrobeItems((items) => [res.data, ...items]);
      setShowWardrobe(true);
    } catch (err) {
      toast("Failed to add to wardrobe");
    }
  };

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
      toast("Failed to build outfit");
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleThriftAction = async (notif, action) => {
    if (!notif.post || !notif.fromUser) return;
    
    if (action === 'decline') {
      // Show decline reason modal
      setSelectedNotification(notif);
      setShowDeclineModal(true);
      return;
    }
    
    try {
      // Always verify using current post state to avoid stale IDs
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
        toast('Request already processed or not found');
        // Reflect latest status in UI if we could resolve it
        if (candidate && candidate.status) {
          const resolved = candidate.status;
          setNotifications((prev) => prev.map(n =>
            n._id === notif._id ? { ...n, requestStatus: resolved } : n
          ));
        }
        return;
      }

      const candidateId = String(candidate?._id?._id || candidate?._id);
      const url = `${API_BASE_URL}/posts/${notif.post._id}/thrift-request/${candidateId}/${action}`;
      await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast(`Thrift request ${action === 'accept' ? 'accepted' : 'declined'}`);

      // Optimistically update this notification's status in UI so actions disappear
      setNotifications((prev) => prev.map(n =>
        n._id === notif._id ? { ...n, requestStatus: action === 'accept' ? 'accepted' : 'declined' } : n
      ));
      setNotifLoading(true);
      axios
        .get(`${API_BASE_URL}/users/notifications/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setNotifications(res.data);
          setNotifLoading(false);
        })
        .catch(() => setNotifLoading(false));
    } catch (err) {
      const message = err.response?.data?.error || `Failed to ${action} request`;
      toast(message);
    }
  };

  const handleDeclineWithReason = async (reason) => {
    if (!selectedNotification) return;
    
    try {
      // Always verify using current post state to avoid stale IDs
      const postRes = await axios.get(`${API_BASE_URL}/posts/${selectedNotification.post._id}`);
      const reqs = postRes.data?.thriftRequests || [];
      let candidate = null;

      if (selectedNotification.requestId) {
        candidate = reqs.find((r) => (r._id === selectedNotification.requestId || (r._id?._id === selectedNotification.requestId)));
      }
      if (!candidate) {
        candidate = reqs.find(
          (r) => (r.requester?._id || r.requester) === (selectedNotification.fromUser?._id || selectedNotification.fromUser)
        );
      }
      if (!candidate || candidate.status !== 'pending') {
        toast('Request already processed or not found');
        if (candidate && candidate.status) {
          const resolved = candidate.status;
          setNotifications((prev) => prev.map(n =>
            n._id === selectedNotification._id ? { ...n, requestStatus: resolved } : n
          ));
        }
        return;
      }

      const candidateId = String(candidate?._id?._id || candidate?._id);
      const url = `${API_BASE_URL}/posts/${selectedNotification.post._id}/thrift-request/${candidateId}/decline`;
      await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });

      // Send decline reason via chat endpoint (will create a closed chat if needed)
      try {
        await axios.post(
          `${API_BASE_URL}/chat/decline-reason/${selectedNotification.post._id}/${candidateId}`,
          { reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (e) {
        // Non-fatal: we already declined; just log
        console.warn('Decline reason send failed', e?.response?.data || e?.message);
      }
      
      // Refresh notifications
      setNotifLoading(true);
      axios
        .get(`${API_BASE_URL}/users/notifications/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setNotifications(res.data);
          setNotifLoading(false);
        })
        .catch(() => setNotifLoading(false));
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to decline request';
      toast(message);
    }
  };

  const modalRef = useRef(null);
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        selectedPost &&
        modalRef.current &&
        !modalRef.current.contains(e.target)
      ) {
        setSelectedPost(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedPost]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMobileMenu && !e.target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileMenu]);

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-black text-white px-4 sm:px-6 lg:px-8 overflow-x-hidden">
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
                    currentUser &&
                    ((typeof notif.post.author === 'string' ? notif.post.author : notif.post.author?._id) === currentUser._id) &&
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
      <nav className="flex justify-between items-center p-4 bg-black border-b border-gray-800 sticky top-0 z-10">
        <h1 className="text-2xl font-extrabold text-blue-500 tracking-wide">
          yours, closet.
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowNotifications(true)}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-pink-400 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Notifications"
          >
            <Bell size={28} />
          </button>
          <button
            onClick={() => setShowChat(true)}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-pink-400 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Messages"
            title="Messages"
          >
            <MessageCircle size={28} />
          </button>
          <button
            onClick={() => setShowWardrobe(true)}
            className="text-white bg-black bg-opacity-60 rounded-full p-2 shadow hover:text-pink-400 transition focus:outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Wardrobe"
            title="Wardrobe"
          >
            <Shirt size={28} />
          </button>
          <div className="hidden md:flex space-x-6 text-lg font-semibold">
            <button
              onClick={() => navigate("/post")}
              className="text-[#B1DDF1] transition transform duration-200 md:hover:scale-105 md:hover:text-white md:hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            >
              Post
            </button>
            <button
              onClick={() => navigate("/browse")}
              className="text-[#B1DDF1] transition transform duration-200 md:hover:scale-105 md:hover:text-white md:hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            >
              Browse
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="text-[#B1DDF1] transition transform duration-200 md:hover:scale-105 md:hover:text-white md:hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="text-[#B1DDF1] transition transform duration-200 md:hover:scale-105 md:hover:text-white md:hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            >
              Logout
            </button>
          </div>

           <div className="md:hidden relative mobile-menu-container">
             <button
               onClick={() => setShowMobileMenu(!showMobileMenu)}
               className="text-[#B1DDF1] text-xl"
             >
               ☰
             </button>
             
             {showMobileMenu && (
               <div className="absolute right-0 top-8 bg-black border border-gray-800 rounded-lg shadow-lg z-20 min-w-[150px]">
                 <button
                   onClick={() => {
                     navigate("/post");
                     setShowMobileMenu(false);
                   }}
                   className="block w-full text-left px-4 py-2 text-[#B1DDF1] hover:bg-gray-800 transition"
                 >
                   Post
                 </button>
                 <button
                   onClick={() => {
                     setShowBuilder(true);
                     setShowMobileMenu(false);
                   }}
                   className="block w-full text-left px-4 py-2 text-[#B1DDF1] hover:bg-gray-800 transition"
                 >
                   Build AI Outfit
                 </button>
                 <button
                   onClick={() => {
                     navigate("/browse");
                     setShowMobileMenu(false);
                   }}
                   className="block w-full text-left px-4 py-2 text-[#B1DDF1] hover:bg-gray-800 transition"
                 >
                   Browse
                 </button>
                 <button
                   onClick={() => {
                     navigate("/profile");
                     setShowMobileMenu(false);
                   }}
                   className="block w-full text-left px-4 py-2 text-[#B1DDF1] hover:bg-gray-800 transition"
                 >
                   Profile
                 </button>
                 <button
                   onClick={() => {
                     handleLogout();
                     setShowMobileMenu(false);
                   }}
                   className="block w-full text-left px-4 py-2 text-[#B1DDF1] hover:bg-gray-800 transition"
                 >
                   Logout
                 </button>
               </div>
             )}
           </div>
         </div>
      </nav>

      <div className="flex">
        <div className="flex-1">
          {aiPosts.length > 0 && (
            <div className="md:hidden p-4 relative">
                             <button
                 onClick={() => setShowRecommendations(!showRecommendations)}
                 className="bg-[#B1DDF1] text-black px-4 py-2 rounded-full hover:bg-[#9BCFE8] transition flex items-center space-x-2"
               >
                <span>🔮</span>
                <span>Recommended ({aiPosts.length})</span>
                <span>{showRecommendations ? '▼' : '▲'}</span>
              </button>
              
              {showRecommendations && (
                <div className="absolute left-4 right-4 mt-2 p-4 bg-gray-900 rounded-lg shadow-lg z-20">
                  <h2 className="text-lg font-bold mb-2 text-blue-300">
                    Recommended for You
                  </h2>
                  <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
                    {aiPosts.map((post) => (
                      <button
                        key={post._id}
                        onClick={() => setSelectedPost(post)}
                        className="min-w-[200px] bg-white text-black rounded-xl overflow-hidden shadow hover:shadow-lg flex-shrink-0 text-left"
                      >
                        <img
                          src={post.image}
                          alt="post"
                          className="w-full h-48 object-cover"
                        />
                                                 <div className="p-2">
                           <p className="font-semibold truncate">{post.caption}</p>
                           {post.isThrift && (
                             <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-block mt-1 ${
                               post.thriftStatus === 'available' 
                                 ? 'text-green-800 bg-green-100' 
                                 : post.thriftStatus === 'sold'
                                 ? 'text-red-800 bg-red-100'
                                 : 'text-yellow-800 bg-yellow-100'
                             }`}>
                               {post.thriftStatus === 'available' ? '🛍️ Available' : 
                                post.thriftStatus === 'sold' ? '❌ Sold' : '⏳ Pending'}
                             </span>
                           )}
                         </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-4">
            <h3 className="text-lg font-bold mb-3">Browse by category</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 snap-x snap-mandatory">
              {['tops','jeans_skirts','dresses','others']
                .filter((cat) => (groups[cat] || []).length > 0)
                .map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setExpandedCategory(cat)}
                    className="relative w-48 h-24 md:w-64 md:h-28 rounded-full overflow-hidden shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-pink-400 text-left flex-shrink-0 snap-start"
                    title={cat === 'jeans_skirts' ? 'Jeans / Skirts' : cat}
                  >
                    <img
                      src={(groups[cat][0] || {}).image}
                      alt="category"
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
                    <div className="relative z-10 p-4">
                      <div className="text-xl font-extrabold tracking-wide">
                        {cat === 'jeans_skirts' ? 'Jeans / Skirts' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </div>
                      <div className="text-xs text-gray-200">{groups[cat].length} posts</div>
                    </div>
                  </button>
                ))}
              <button
                onClick={() => setShowBuilder(true)}
                className="relative w-48 h-24 md:w-64 md:h-28 rounded-full overflow-hidden shadow hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-pink-400 text-left flex-shrink-0 snap-start bg-gradient-to-r from-pink-600 to-purple-600"
                title="Build AI Outfit"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-extrabold text-lg md:text-xl">Build AI Outfit</span>
                </div>
              </button>
            </div>
          </div>

          {/* Main Feed */}
          {publicPosts.length > 0 && (
            <div className="p-4">
              <h3 className="text-lg font-bold mb-3">All Posts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {publicPosts.map((post) => {
                  const isLiked = currentUser?.likedPosts?.some(
                    (id) => id.toString() === post._id.toString()
                  );
                  
                  return (
                    <div
                      key={post._id}
                      className="bg-white text-black rounded-xl overflow-hidden shadow hover:shadow-lg transition text-left relative"
                    >
                      <div
                        className="w-full bg-gray-200 overflow-hidden cursor-pointer"
                        onClick={() => setSelectedPost(post)}
                        style={{ aspectRatio: '4 / 5' }}
                      >
                        <img
                          src={post.image}
                          alt="post"
                          className="w-full h-full object-cover"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      <div className="p-3 md:p-4 space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-base md:text-lg">{post.caption}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(post._id);
                            }}
                            className="text-xl"
                            title={isLiked ? "Unlike" : "Like"}
                          >
                            {isLiked ? "❤️" : "🤍"}
                          </button>
                        </div>
                        {post.tags?.length > 0 && (
                          <p className="text-sm text-gray-600">
                            #{post.tags.join(" #")}
                          </p>
                        )}
                        {post.isThrift && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            post.thriftStatus === 'available' 
                              ? 'text-green-800 bg-green-100' 
                              : post.thriftStatus === 'sold'
                              ? 'text-red-800 bg-red-100'
                              : 'text-yellow-800 bg-yellow-100'
                          }`}>
                            {post.thriftStatus === 'available' ? '🛍️ Available' : 
                             post.thriftStatus === 'sold' ? '❌ Sold' : '⏳ Pending'}
                          </span>
                        )}
                        <p className="text-xs text-gray-600">
                          Posted by{" "}
                          <span 
                            className="font-medium text-pink-500 hover:text-pink-400 cursor-pointer underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (post.author?._id) {
                                navigate(`/user/${post.author._id}`);
                              }
                            }}
                          >
                            {post.author?.username || "Unknown"}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {aiPosts.length > 0 && (
          <div className="hidden md:block w-80 bg-gray-900 p-4 border-l border-gray-800">
            <h2 className="text-lg font-bold mb-4 text-purple-300">
              🔮 Recommended for You
            </h2>
            <div className="space-y-4">
              {aiPosts.map((post) => (
                <button
                  key={post._id}
                  onClick={() => setSelectedPost(post)}
                  className="w-full bg-white text-black rounded-xl overflow-hidden shadow hover:shadow-lg transition text-left"
                >
                  <img
                    src={post.image}
                    alt="post"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-3">
                    <p className="font-semibold text-sm mb-1 truncate">{post.caption}</p>
                    {post.isThrift && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${
                        post.thriftStatus === 'available' 
                          ? 'text-green-800 bg-green-100' 
                          : post.thriftStatus === 'sold'
                          ? 'text-red-800 bg-red-100'
                          : 'text-yellow-800 bg-yellow-100'
                      }`}>
                        {post.thriftStatus === 'available' ? '🛍️ Available' : 
                         post.thriftStatus === 'sold' ? '❌ Sold' : '⏳ Pending'}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target.classList.contains("fixed")) setSelectedPost(null);
          }}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-lg overflow-hidden max-w-md w-full"
          >
            <img
              src={selectedPost.image}
              alt="zoom"
              className="w-full h-96 object-cover"
            />
            <div className="p-4 text-black">
              <h3 className="font-bold text-lg mb-2">
                {selectedPost.caption}
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                {selectedPost.tags?.length
                  ? `#${selectedPost.tags.join(" #")}`
                  : ""}
              </p>
              
               {selectedPost.isThrift && (
                 <div className="mb-3">
                    {selectedPost.thriftStatus === 'available' ? (
                     <div className="flex items-center justify-between">
                       <p className="text-xs text-green-700 font-medium">
                         🛍️ Available for Thrift
                       </p>

                        <div className="flex gap-2">
                          {currentUser && selectedPost.author?._id !== currentUser._id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestThrift(selectedPost._id);
                              }}
                              className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              Request Thrift
                            </button>
                          )}
                          {currentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToWardrobe(selectedPost);
                              }}
                              className="bg-white text-pink-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              + Wardrobe
                            </button>
                          )}
                        </div>
                     </div>
                   ) : selectedPost.thriftStatus === 'sold' ? (
                     <p className="text-xs text-red-700 font-medium">
                       ❌ Sold
                     </p>
                    ) : (
                     <p className="text-xs text-yellow-700 font-medium">
                       ⏳ Pending
                     </p>
                   )}
                 </div>
               )}
                {!selectedPost.isThrift && currentUser && (
                  <div className="mb-3 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToWardrobe(selectedPost);
                      }}
                      className="bg-white text-pink-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      + Wardrobe
                    </button>
                  </div>
                )}
              
              <p className="text-sm text-gray-500">
                Posted by{" "}
                <span 
                  className="font-semibold text-pink-500 hover:text-pink-400 cursor-pointer underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPost.author?._id) {
                      navigate(`/user/${selectedPost.author._id}`);
                      setSelectedPost(null);
                    }
                  }}
                >
                  {selectedPost.author?.username || "Unknown"}
                </span>
              </p>
              {currentUser && selectedPost.author?._id === currentUser._id && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await axios.delete(`${API_BASE_URL}/posts/${selectedPost._id}`, { headers: { Authorization: `Bearer ${token}` } });
                        toast('Post deleted');
                        setSelectedPost(null);
                        setPublicPosts((prev)=>prev.filter(p=>p._id!==selectedPost._id));
                        setAiPosts((prev)=>prev.filter(p=>p._id!==selectedPost._id));
                      } catch {
                        toast('Failed to delete post');
                      }
                    }}
                    className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {expandedCategory && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-90 flex items-start justify-center p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target.classList.contains("fixed")) setExpandedCategory(null);
          }}
        >
          <div className="bg-black border border-gray-800 rounded-2xl max-w-5xl w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">
                {expandedCategory === 'jeans_skirts' ? 'Jeans / Skirts' : expandedCategory.charAt(0).toUpperCase() + expandedCategory.slice(1)}
              </h3>
              <button className="text-white text-xl" onClick={() => setExpandedCategory(null)}>×</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-2">
              {(groups[expandedCategory] || []).map((post) => (
                <button
                  key={post._id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white text-black rounded-xl overflow-hidden shadow hover:shadow-lg transition text-left"
                >
                  <img src={post.image} alt="post" className="w-full h-48 object-cover" />
                  <div className="p-3">
                    <p className="font-semibold text-sm mb-1 truncate">{post.caption}</p>
                  </div>
                </button>
              ))}
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
                      <button
                        className="ml-auto text-xs px-2 py-1 bg-gray-800 rounded hover:bg-gray-700"
                        onClick={async () => {
                          try {
                            await axios.delete(`${API_BASE_URL}/wardrobe/${item._id}`, { headers: { Authorization: `Bearer ${token}` } });
                            setWardrobeItems((prev) => prev.filter((w) => w._id !== item._id));
                          } catch {
                            toast('Failed to remove');
                          }
                        }}
                      >
                        Remove
                      </button>
                        </div>
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

      {/* Chat Modal */}
      <Chat 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
      />

      {/* Decline Reason Modal */}
      <DeclineReasonModal
        isOpen={showDeclineModal}
        onClose={() => {
          setShowDeclineModal(false);
          setSelectedNotification(null);
        }}
        notification={selectedNotification}
        onDecline={handleDeclineWithReason}
      />
    </div>
  );
}