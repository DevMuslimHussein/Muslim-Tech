"use client";

interface Point {
  date: string;
  count: number;
}

/** Area chart with a faint grid and an emphasized endpoint. */
export function AreaChart({ data, label }: { data: Point[]; label: string }) {
  const width = 560;
  const height = 160;
  const padding = { top: 12, right: 8, bottom: 22, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.count), 1);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.count / max) * innerH,
    ...d,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points.at(-1)?.x.toFixed(1)},${padding.top + innerH} L${points[0]?.x.toFixed(1)},${padding.top + innerH} Z`;
  const last = points.at(-1);

  const gridLines = [0, 0.5, 1].map((f) => padding.top + innerH * f);

  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-sm font-medium text-ink-soft">{label}</figcaption>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full min-w-[420px]" role="img" aria-label={label}>
          <defs>
            <linearGradient id="mt-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--mt-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--mt-accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridLines.map((y, i) => (
            <line
              key={i}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="var(--mt-border)"
              strokeWidth="1"
            />
          ))}

          <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" fontSize="10" fill="var(--mt-muted)">
            {max}
          </text>
          <text x={padding.left - 6} y={padding.top + innerH + 4} textAnchor="end" fontSize="10" fill="var(--mt-muted)">
            0
          </text>

          <path d={area} fill="url(#mt-area-fill)" />
          <path d={line} fill="none" stroke="var(--mt-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {last && (
            <>
              <circle cx={last.x} cy={last.y} r="5" fill="var(--mt-accent)" opacity="0.22" />
              <circle cx={last.x} cy={last.y} r="2.8" fill="var(--mt-accent)" />
            </>
          )}

          {points.map((p, i) => (
            <title key={i}>{`${p.date}: ${p.count}`}</title>
          ))}
        </svg>
      </div>
    </figure>
  );
}

/** Horizontal bars — better for Arabic category labels than vertical bars. */
export function BarList({
  data,
  label,
}: {
  data: { name: string; lectures: number }[];
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.lectures), 1);

  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-sm font-medium text-ink-soft">{label}</figcaption>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد بيانات بعد</p>
      ) : (
        <ul className="space-y-3">
          {data.map((item) => (
            <li key={item.name}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="truncate text-sm text-ink">{item.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-ink-soft">{item.lectures}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-brand transition-[width] duration-700 ease-mt"
                  style={{ width: `${(item.lectures / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
