/**
 * Accepts anything an admin is likely to paste — a watch URL, a share link,
 * an embed URL, or the bare id — and returns the 11-character video id.
 * Returns null when the input carries no recognisable id.
 */
export function extractYoutubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  // Already a bare id.
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value.startsWith('http') ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  // https://youtu.be/VIDEOID
  if (host === 'youtu.be') {
    return normalise(url.pathname.slice(1));
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    // https://youtube.com/watch?v=VIDEOID
    const v = url.searchParams.get('v');
    if (v) return normalise(v);

    // /embed/VIDEOID, /shorts/VIDEOID, /live/VIDEOID, /v/VIDEOID
    const match = /^\/(embed|shorts|live|v)\/([^/?]+)/.exec(url.pathname);
    if (match) return normalise(match[2]);
  }

  return null;
}

function normalise(candidate: string): string | null {
  const id = candidate.split(/[?&#]/)[0];
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
