"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SAVE_INTERVAL_MS = 10_000;

/** Minimal shape of the bits of the YouTube IFrame API this component uses. */
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        options: Record<string, unknown>,
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

/** Loads the IFrame API once per page, no matter how many players mount. */
function loadYoutubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

/**
 * Plays a YouTube-hosted lecture inside the app and reports progress to the
 * same endpoint the uploaded-video player uses, so "resume where you left off"
 * works identically for both kinds of lecture.
 */
export function YoutubePlayer({
  lectureId,
  youtubeId,
}: {
  lectureId: string;
  youtubeId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const resumeAtRef = useRef<number | null>(null);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [hasResumed, setHasResumed] = useState(false);

  const save = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    let current: number;
    let duration: number;
    try {
      current = player.getCurrentTime();
      duration = player.getDuration();
    } catch {
      return;
    }
    if (!duration || Number.isNaN(duration)) return;

    void fetch(`/api/proxy/lectures/${lectureId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progressSeconds: Math.floor(current),
        durationSeconds: Math.floor(duration),
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [lectureId]);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/proxy/lectures/${lectureId}/progress`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { progressSeconds?: number; completed?: boolean } | null) => {
        if (cancelled) return;
        if (data?.progressSeconds && data.progressSeconds > 5 && !data.completed) {
          resumeAtRef.current = data.progressSeconds;
          setResumeAt(data.progressSeconds);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [lectureId]);

  useEffect(() => {
    let cancelled = false;

    void loadYoutubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          // Trim the affordances that lead students off-platform.
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            const at = resumeAtRef.current;
            if (at !== null) {
              playerRef.current?.seekTo(at, true);
              setHasResumed(true);
            }
          },
          onStateChange: (event: { data: number }) => {
            // 2 = paused, 0 = ended
            if (event.data === 2 || event.data === 0) save();
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [youtubeId, save]);

  useEffect(() => {
    const timer = setInterval(save, SAVE_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      save();
    };
  }, [save]);

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black shadow-md">
        <div ref={containerRef} className="size-full" />
      </div>
      {resumeAt !== null && !hasResumed && (
        <p className="mt-2 text-xs text-muted">
          سيُستأنف التشغيل من الدقيقة {Math.floor(resumeAt / 60)}:
          {String(Math.floor(resumeAt % 60)).padStart(2, "0")}
        </p>
      )}
    </div>
  );
}
