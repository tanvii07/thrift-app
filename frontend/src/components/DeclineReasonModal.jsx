import { useState } from "react";
import { useToast } from "./ToastProvider";
import { X, Send } from "lucide-react";

export default function DeclineReasonModal({ isOpen, onClose, notification, onDecline }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  // const token = localStorage.getItem("token");
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      setLoading(true);
      await onDecline?.(reason.trim());
      toast("Decline reason sent successfully");
      onClose();
    } catch (error) {
      console.error("Error sending decline reason:", error);
      toast("Failed to send decline reason");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Provide a reason for declining</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Let the requester know why you're declining their thrift request for "{notification?.post?.caption}".
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., The item is already sold out, size doesn't match, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
            required
          />
          
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send Reason</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
