/* eslint-disable @typescript-eslint/no-explicit-any */
// Google Maps JavaScript API loader (browser-only).
// Uses the referrer-restricted browser key exposed by the Google Maps connector.

const KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let loader: Promise<any> | null = null;

export function hasGoogleMapsKey(): boolean {
  return !!KEY;
}

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps needs a browser"));
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  if (loader) return loader;
  if (!KEY) return Promise.reject(new Error("Google Maps key missing"));

  loader = new Promise((resolve, reject) => {
    const cb = "__yururiInitGoogleMaps";
    w[cb] = () => resolve(w.google.maps);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: KEY,
      libraries: "places",
      loading: "async",
      callback: cb,
      language: "ja",
      region: "JP",
    });
    if (CHANNEL) params.set("channel", CHANNEL);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => { loader = null; reject(new Error("Failed to load Google Maps")); };
    document.head.appendChild(s);
  });
  return loader;
}

/** Tokyo by default; the map zooms out to the whole world freely. */
export const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 };

export const PIN_COLORS = {
  /** 困った — light blue per spec */
  problem: "#38BDF8",
  /** 解決済み — pink heart */
  resolved: "#EC4899",
  /** 活動 */
  activity: "#10B981",
} as const;

export type PinKind = keyof typeof PIN_COLORS;

/** Returns a data-URI SVG teardrop pin (or heart pin for resolved posts). */
export function pinSvgUrl(kind: PinKind, label: string): string {
  const color = PIN_COLORS[kind];
  const text = label
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = kind === "resolved"
    ? `<path d="M17 41C17 41 2 27.5 2 16.5C2 9.6 7.4 4 14 4c2.4 0 4.6 1 6 2.6C21.4 5 23.6 4 26 4c6.6 0 12 5.6 12 12.5C38 27.5 17 41 17 41z" transform="translate(-3,0)" fill="${color}" stroke="#fff" stroke-width="2"/>`
    : `<path d="M17 42C17 42 3 26.7 3 16.5A14 14 0 0 1 31 16.5C31 26.7 17 42 17 42z" fill="${color}" stroke="#fff" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
    ${body}
    <text x="17" y="${kind === "resolved" ? 24 : 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${text}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
