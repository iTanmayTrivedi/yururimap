// Optional local-only profile from initial setup: age group, gender, residential area,
// location permission preference. All optional; never sent to a server.
export type Profile = {
  ageGroup?: string;
  gender?: string;
  homeArea?: string;
  homeLat?: number;
  homeLng?: number;
  locationOn?: boolean;
  setupComplete?: boolean;
};

const KEY = "niko_profile";

export function loadProfile(): Profile {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : {};
  } catch {
    return {};
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
