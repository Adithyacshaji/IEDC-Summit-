import React, { useState } from "react";
import { MapPin, Loader2, RefreshCw, X, AlertTriangle } from "lucide-react";

export default function LocationAlertCard({ onRetry, onClose }) {
  const [retrying, setRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleRetry = async () => {
    setRetrying(true);
    setAttempts((a) => a + 1);
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-[2500] pointer-events-none animate-in slide-in-from-bottom duration-300">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-gray-100 p-5 flex flex-col gap-3 relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />

        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <MapPin size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                Turn On Location Services
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                GPS is turned off or access was denied
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body Message */}
        <p className="text-xs text-gray-600 leading-relaxed">
          Please enable location services on your device and browser to view your real-time position on campus and follow live directions.
        </p>

        {/* Helper Hint on Failed Attempts */}
        {attempts >= 1 && !retrying && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 flex items-start gap-2">
            <AlertTriangle size={16} className="text-slate-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              {attempts === 1
                ? "Still blocked. Tap the 🔒 icon in your address bar → Site Settings → Allow Location."
                : "Ensure Location/GPS is turned ON in your mobile phone settings, then tap Try Again."}
            </p>
          </div>
        )}

        {/* Action Button: Try Again */}
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-2xl text-sm shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {retrying ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Checking for GPS location…</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              <span>{attempts === 0 ? "Try Again" : "Try Again to Get Location"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
