"use client";

import { useEffect, useState } from "react";

export function BookmarkButton({ lectureId }: { lectureId: string }) {
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/proxy/lectures/${lectureId}/bookmark`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { bookmarked?: boolean } | null) => {
        if (!cancelled) setBookmarked(data?.bookmarked ?? false);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [lectureId]);

  async function toggle() {
    setIsBusy(true);
    const response = await fetch(`/api/proxy/lectures/${lectureId}/bookmark`, { method: "POST" });
    if (response.ok) {
      const data = (await response.json()) as { bookmarked: boolean };
      setBookmarked(data.bookmarked);
    }
    setIsBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isBusy || bookmarked === null}
      aria-pressed={bookmarked ?? false}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-all duration-150 disabled:opacity-50 ${
        bookmarked
          ? "border-accent-soft-border bg-accent-soft text-accent-ink"
          : "border-border text-ink-soft hover:border-accent hover:text-accent-ink"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={15}
        height={15}
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6.5 4h11a1 1 0 0 1 1 1v15.5L12 16.5 5.5 20.5V5a1 1 0 0 1 1-1z" />
      </svg>
      {bookmarked ? "محفوظة" : "حفظ"}
    </button>
  );
}
