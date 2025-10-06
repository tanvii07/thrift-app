import { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useToast } from "./ToastProvider";
import { X, Send } from "lucide-react";

export default function Chat({ isOpen, onClose, selectedChat, onChatSelect }) {
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token");
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      fetchChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/chat/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data.chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      setMessagesLoading(true);
      const response = await axios.get(`${API_BASE_URL}/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/${selectedChatId}/message`,
        { content: newMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(prev => [...prev, response.data.newMessage]);
      setNewMessage("");
      
      // Update chat list with new last message
      setChats(prev => prev.map(chat => 
        chat._id === selectedChatId 
          ? { ...chat, lastMessage: response.data.newMessage, lastMessageAt: new Date() }
          : chat
      ));
    } catch (error) {
      console.error("Error sending message:", error);
      toast("Failed to send message");
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChatId(chat._id);
    if (onChatSelect) {
      onChatSelect(chat);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherParticipant = (chat) => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const currentUserId = storedUser?._id || storedUser?.id;
    return chat.participants.find(p => p._id !== currentUserId);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex"
      onClick={() => onClose?.()}
    >
      <div
        className="bg-white w-full h-full md:max-w-5xl md:h-auto md:my-4 md:rounded-lg flex flex-col md:flex-row mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat List Sidebar */}
        <div className="w-full md:w-1/3 border-gray-200 md:border-r flex flex-col h-1/3 md:h-auto">
          <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Messages</h2>
              <button
                onClick={() => onClose?.()}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No chats yet</div>
            ) : (
              chats.map((chat) => {
                const otherParticipant = getOtherParticipant(chat);
                return (
                  <div
                    key={chat._id}
                    onClick={() => handleChatSelect(chat)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedChatId === chat._id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {otherParticipant?.profilePic ? (
                          <img
                            src={otherParticipant.profilePic}
                            alt={otherParticipant.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {otherParticipant?.username?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-gray-900">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate text-gray-900">
                            {otherParticipant?.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(chat.lastMessageAt)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {chat.lastMessage?.content || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col h-2/3 md:h-auto">
          {selectedChatId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                {(() => {
                  const chat = chats.find(c => c._id === selectedChatId);
                  const otherParticipant = chat ? getOtherParticipant(chat) : null;
                  return (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {otherParticipant?.profilePic ? (
                          <img
                            src={otherParticipant.profilePic}
                            alt={otherParticipant.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {otherParticipant?.username?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-900">
                        <p className="font-medium text-gray-900">{otherParticipant?.username}</p>
                        <p className="text-sm text-gray-600">
                          {chat?.post?.caption}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {messagesLoading ? (
                  <div className="text-center">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">No messages yet</div>
                ) : (
                  messages.map((message) => {
                    const storedUser = JSON.parse(localStorage.getItem("user"));
                    const currentUserId = storedUser?._id || storedUser?.id;
                    const isOwn = message.sender._id === currentUserId;
                    
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg break-words ${
                            isOwn
                              ? 'bg-blue-500 text-white'
                              : message.messageType === 'decline_reason'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwn ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-white sticky bottom-0">
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
