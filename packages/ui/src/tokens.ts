export const colorTokens = {
  light: {
    bg: "#f7f8fa",
    surface: "#ffffff",
    surface2: "#f1f3f7",
    border: "#dfe3ec",
    ink: "#10131c",
    inkSoft: "#4e5568",
    muted: "#858da3",
    accent: "#0f766e",
    accentInk: "#0b544e",
    accentSoft: "#d6f0ec",
    violet: "#4f46e5",
    success: "#15803d",
    warning: "#b45309",
    danger: "#be123c",
    info: "#0369a1",
  },
  dark: {
    bg: "#0b0e14",
    surface: "#141924",
    surface2: "#1b2130",
    border: "#262d3d",
    ink: "#eef1f7",
    inkSoft: "#b3bacd",
    muted: "#7d8598",
    accent: "#2dd4bf",
    accentInk: "#7fe7d8",
    accentSoft: "#0d2f2c",
    violet: "#8b83f5",
    success: "#4ade80",
    warning: "#fbbf24",
    danger: "#fb7185",
    info: "#60a5fa",
  },
} as const;

export type ThemeMode = "light" | "dark";

/** Series colors for charts, ordered for maximum adjacent contrast. */
export const chartSeries = ["#0f766e", "#4f46e5", "#0369a1", "#b45309", "#be123c"] as const;

export const fontStacks = {
  ar: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
  en: '"IBM Plex Sans", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "Cascadia Code", monospace',
} as const;
