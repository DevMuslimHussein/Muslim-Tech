"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SAVE_INTERVAL_MS = 10_000;

/**
 * Saves playback position periodically and on unmount, and resumes from the
 * last saved position when the media is ready.
 */
export function VideoPlayer({ lectureId, src }: { lectureId: string; src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [hasResumed, setHasResumed] = useState(false);

  const save = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || Number.isNaN(video.duration)) return;

    const payload = JSON.stringify({
      progressSeconds: Math.floor(video.currentTime),
      durationSeconds: Math.floor(video.duration),
    });

    // keepalive lets the final save survive navigation away from the page.
    void fetch(`/api/proxy/lectures/${lectureId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: payload,
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
          setResumeAt(data.progressSeconds);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [lectureId]);

  useEffect(() => {
    const timer = setInterval(save, SAVE_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      save();
    };
  }, [save]);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (video && resumeAt !== null && !hasResumed) {
      video.currentTime = resumeAt;
      setHasResumed(true);
    }
  }

  return (
    <div>
      <video
        ref={videoRef}
        controls
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onPause={save}
        onEnded={save}
        className="w-full rounded-lg border border-border bg-black shadow-md"
        src={src}
      />
      {resumeAt !== null && !hasResumed && (
        <p className="mt-2 text-xs text-muted">
          سيُستأنف التشغيل من الدقيقة {Math.floor(resumeAt / 60)}:
          {String(Math.floor(resumeAt % 60)).padStart(2, "0")}
        </p>
      )}
    </div>
  );
}
