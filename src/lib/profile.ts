// Optional local-only profile from initial setup: age group, gender, residential area,
// location permission preference. All optional; never sent to a server without consent.
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

export const AGE_GROUPS = [
  { id: "10s", ja: "10代", en: "10s" },
  { id: "20s", ja: "20代", en: "20s" },
  { id: "30s", ja: "30代", en: "30s" },
  { id: "40s", ja: "40代", en: "40s" },
  { id: "50s", ja: "50代", en: "50s" },
  { id: "60plus", ja: "60代以上", en: "60+" },
] as const;

export const GENDERS = [
  { id: "female", ja: "女性", en: "Female" },
  { id: "male", ja: "男性", en: "Male" },
  { id: "other", ja: "その他・回答しない", en: "Other / prefer not" },
] as const;

export function loadProfile(): Profile {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : {};
  } catch { return {}; }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Snapshot the (optional) demographic fields to send with a post/like for analytics. */
export function demoSnapshot() {
  const p = loadProfile();
  return {
    age_group: p.ageGroup ?? null,
    gender: p.gender ?? null,
    home_area: p.homeArea ?? null,
  };
}
