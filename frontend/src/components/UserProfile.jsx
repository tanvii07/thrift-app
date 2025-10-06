import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "./ToastProvider";

export default function UserProfile() {
  const [userPosts, setUserPosts] = useState([]);
  const [stats, setStats] = useState({});
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useParams();
  const token = localStorage.getItem("token");
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const currentUserRes = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(currentUserRes.data.user);

        const userRes = await axios.get(`${API_BASE_URL}/users/${userId}`);
        setUser(userRes.data);

        const isFollowingUser = currentUserRes.data.user.following.some(id => id.toString() === userId);
        setIsFollowing(isFollowingUser);

        const postsRes = await axios.get(`${API_BASE_URL}/posts/user/${userId}`);
        setUserPosts(postsRes.data);

        const statsRes = await axios.get(`${API_BASE_URL}/posts/user/${userId}/stats`);
        setStats(statsRes.data);

      } catch (err) {
        console.error("Failed to load user profile:", err);
        alert("Couldn't load user profile");
        navigate("/home");
      } finally {
        setIsLoading(false);
      }
    };

    if (token && userId) fetchData();
    else navigate("/auth");
  }, [token, userId, navigate]);

  const handleFollowToggle = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/users/${userId}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsFollowing(res.data.following);
      
      setUser(prev => ({
        ...prev,
        followers: res.data.following 
          ? [...prev.followers, currentUser._id]
          : prev.followers.filter(id => id.toString() !== currentUser._id.toString())
      }));

    } catch (err) {
      console.error("Failed to toggle follow:", err);
      alert("Failed to update follow status");
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

      setUserPosts(prevPosts =>
        prevPosts.map((post) =>
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
        )
      );
      
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p>User not found</p>
          <button 
            onClick={() => navigate("/home")}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?._id === userId;

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-y-auto">
      <button
        onClick={() => navigate(-1)}
        className="block absolute top-4 left-4 text-white text-xl z-50 p-2 bg-black bg-opacity-60 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-pink-400"
        style={{ textShadow: "0 0 4px rgba(255, 255, 255, 0.4)" }}
        aria-label="Go Back"
      >
        ←
      </button>

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

        {!isOwnProfile && (
          <button
            onClick={handleFollowToggle}
            className={`px-6 py-2 rounded-full font-semibold transition-colors ${
              isFollowing
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}

        <div className="flex space-x-8 text-center mt-4">
          <div>
            <p className="text-lg font-semibold">{userPosts.length}</p>
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

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {userPosts.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-8">
            <p>No posts yet</p>
          </div>
        ) : (
          userPosts.map((post) => (
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
          ))
        )}
      </div>

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
                <div className="mb-3">
                  {selectedPost.thriftStatus === 'available' ? (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-green-700 font-medium">
                        🛍️ Available for Thrift
                      </p>
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
    </div>
  );
}