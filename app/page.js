"use client";

import { useState, useEffect } from "react";

const TOTAL_DURATION = 360;

function getProgress(elapsed) {
  if (elapsed <= 0) return 0;
  if (elapsed >= TOTAL_DURATION) {
    const extra = elapsed - TOTAL_DURATION;
    return Math.min(90 + extra * 0.015, 97);
  }
  const t = elapsed / TOTAL_DURATION;
  return t * 90;
}

function formatTimeRemaining(elapsed) {
  const rawRemaining = TOTAL_DURATION - elapsed;
  if (rawRemaining <= 0) return "Almost there";
  const minutes = Math.ceil(rawRemaining / 60);
  if (minutes >= 6) return "About 6 minutes";
  if (minutes > 1) return "About " + minutes + " minutes";
  const secs = Math.max(Math.ceil(rawRemaining), 1);
  if (secs > 30) return "Less than a minute";
  return "A few seconds";
}

export default function LoadingPage() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? sessionStorage.getItem("loading_start")
      : null;

    let startTime;
    if (stored) {
      startTime = parseInt(stored, 10);
    } else {
      startTime = Date.now();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("loading_start", String(startTime));
      }
    }

    const tick = () => {
      const now = Date.now();
      const secondsElapsed = (now - startTime) / 1000;
      setElapsed(secondsElapsed);
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, []);

  const progress = getProgress(elapsed);
  const timeText = formatTimeRemaining(elapsed);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0f] flex items-center justify-center">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="blob-1 absolute rounded-full blur-[120px] opacity-30"
          style={{
            width: "500px",
            height: "500px",
            top: "-10%",
            left: "-10%",
            background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
          }}
        />
        <div
          className="blob-2 absolute rounded-full blur-[120px] opacity-25"
          style={{
            width: "600px",
            height: "600px",
            top: "40%",
            right: "-15%",
            background: "radial-gradient(circle, #2563eb 0%, transparent 70%)",
          }}
        />
        <div
          className="blob-3 absolute rounded-full blur-[120px] opacity-20"
          style={{
            width: "450px",
            height: "450px",
            bottom: "-10%",
            left: "30%",
            background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto px-6 sm:px-8">
        <div className="text-center">
          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-3">
            Building Your App
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-base sm:text-lg mb-12">
            Hang tight while we set everything up for you
          </p>

          {/* Progress section */}
          <div className="mb-8">
            {/* Progress bar container */}
            <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4">
              {/* Progress fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full progress-glow transition-all duration-500 ease-out"
                style={{
                  width: progress + "%",
                  background:
                    "linear-gradient(90deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)",
                }}
              >
                {/* Shimmer */}
                <div
                  className="shimmer-effect absolute inset-0 w-1/2"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  }}
                />
              </div>
            </div>

            {/* Progress info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 tabular-nums">
                {Math.round(progress)}%
              </span>
              <span className="text-gray-500">{timeText}</span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2.5">
            <span
              className="pulse-dot inline-block w-2 h-2 rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
              }}
            />
            <span className="text-gray-400 text-sm font-medium">
              Working on it
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
