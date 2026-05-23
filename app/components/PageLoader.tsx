"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Route changed — stop loader
    setLoading(false);
    setProgress(100);
    const t = setTimeout(() => setProgress(0), 400);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Only trigger for internal non-hash links
      if (href.startsWith("/") && !href.startsWith("/#")) {
        startLoader();
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const startLoader = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    setProgress(0);
    setLoading(true);

    // Animate progress bar from 0 → 85 quickly, then slow down
    let p = 0;
    progressRef.current = setInterval(() => {
      p += p < 30 ? 8 : p < 60 ? 4 : p < 80 ? 1 : 0.3;
      if (p >= 85) {
        clearInterval(progressRef.current!);
        p = 85;
      }
      setProgress(p);
    }, 60);

    // Safety fallback — stop after 8s
    timerRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 8000);
  };

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed inset-x-0 top-0 z-[9999] h-[2px]">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 shadow-[0_0_8px_rgba(249,115,22,0.7)] transition-all"
          style={{
            width: `${progress}%`,
            transitionDuration: progress === 100 ? "200ms" : "400ms",
            transitionTimingFunction: "ease-out",
          }}
        />
      </div>

      {/* Subtle full-page overlay so user knows something is happening */}
      {loading && (
        <div className="fixed inset-0 z-[9998] cursor-wait" />
      )}
    </>
  );
}
