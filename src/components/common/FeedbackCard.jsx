import React, { useState } from 'react';
import { CheckCircle2, Star, X, Send, Heart } from 'lucide-react';

export default function FeedbackCard({ destination, onClose }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!destination) return null;

  const title = destination.event_name || destination.name || destination.id || 'Destination';

  const tagsList = [
    '🎯 Accurate Path',
    '⏱️ Fast Route',
    '📍 Easy to Find',
    '🚶 Clear Guidance',
    '✨ Great App Experience'
  ];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header decoration */}
        <div className="bg-blue-600 p-6 text-white text-center relative overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/30">
            <CheckCircle2 size={36} className="text-white animate-bounce" />
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">You've Arrived! 🎉</h2>
          <p className="text-xs text-white/90 font-medium mt-1 truncate max-w-xs mx-auto">
            {title}
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Heart size={28} className="fill-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Thank You for Your Feedback!</h3>
            <p className="text-sm text-gray-500">
              Your feedback helps us continuously improve campus navigation for everyone at IEDC Summit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            {/* Rating Stars */}
            <div className="text-center">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                How was your navigation route?
              </label>
              <div className="flex justify-center items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        size={28}
                        className={
                          active
                            ? 'text-blue-600 fill-blue-600 transition-colors'
                            : 'text-gray-300 transition-colors'
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Tag Chips */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Quick Feedback Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tagsList.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment Text Area */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any additional thoughts or suggestions? (optional)"
                rows={2}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl text-sm transition-colors"
              >
                Skip
              </button>

              <button
                type="submit"
                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Send size={16} />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
