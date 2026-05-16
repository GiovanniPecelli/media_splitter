"use client";

import { useEffect, useState } from "react";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300); // wait for exit animation
  };

  return (
    <div
      className={`
        flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4
        transition-all duration-300 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
      `}
      role="alert"
      aria-live="assertive"
    >
      <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-red-300 leading-relaxed">{message}</p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss error"
        className="text-red-400 hover:text-red-200 transition-colors duration-150 flex-shrink-0"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
