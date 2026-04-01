"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __senhoraHobbieIntroPlayed?: boolean;
  }
}

export default function HomeIntroOverlay() {
  const [shouldShow] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const navigationEntry = window.performance
      .getEntriesByType("navigation")
      .at(0) as PerformanceNavigationTiming | undefined;

    const loadedPath =
      navigationEntry?.name != null
        ? new URL(navigationEntry.name, window.location.origin).pathname
        : window.location.pathname;

    if (loadedPath !== "/") {
      return false;
    }

    return !window.__senhoraHobbieIntroPlayed;
  });

  useEffect(() => {
    if (!shouldShow || typeof window === "undefined") {
      return;
    }

    window.__senhoraHobbieIntroPlayed = true;
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="intro-overlay" aria-hidden="true">
      <div className="intro-mark">
        <span className="intro-stroke intro-stroke-1" />
        <span className="intro-stroke intro-stroke-2" />
        <span className="intro-stroke intro-stroke-3" />
        <p>clube das jovens senhoras</p>
      </div>
    </div>
  );
}
