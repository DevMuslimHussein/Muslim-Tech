export function apiUrl(path: string): string {
  const base = process.env.API_URL ?? "http://localhost:4000";
  return `${base}${path}`;
}
