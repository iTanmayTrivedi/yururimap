// Optional local-only profile from initial setup: age group, gender, residential area,
// country/region, location permission. All optional; never sent to a server without consent.
export type Profile = {
  ageGroup?: string;
  gender?: string;
  homeArea?: string;
  homeLat?: number;
  homeLng?: number;
  countryRegion?: string;
  locationOn?: boolean;
  setupComplete?: boolean;
};

const KEY = "niko_profile";

// 10-bucket age set from the mockup (with face-icon suggestions).
export const AGE_GROUPS = [
  { id: "preschool",    ja: "未就学児 (0〜6歳)",  en: "Preschool (0–6)",         emoji: "🧒" },
  { id: "elementary",   ja: "小学生",             en: "Elementary",              emoji: "🎒" },
  { id: "middle",       ja: "中学生",             en: "Middle school",           emoji: "📘" },
  { id: "high",         ja: "高校生",             en: "High school",             emoji: "🎓" },
  { id: "young",        ja: "18〜22歳 (学生・新社会人)", en: "18–22 (student/new)", emoji: "🧑" },
  { id: "adult",        ja: "23〜40歳",           en: "23–40",                   emoji: "🧑‍💼" },
  { id: "middle_age",   ja: "41〜59歳",           en: "41–59",                   emoji: "👩" },
  { id: "senior60",     ja: "60〜69歳",           en: "60–69",                   emoji: "👨" },
  { id: "senior70",     ja: "70〜79歳",           en: "70–79",                   emoji: "🧓" },
  { id: "senior80",     ja: "80歳以上",           en: "80+",                     emoji: "👵" },
  { id: "no_answer",    ja: "回答しない",         en: "Prefer not to say",       emoji: "❓" },
] as const;

export const GENDERS = [
  { id: "female",    ja: "女性",     en: "Female",             emoji: "♀" },
  { id: "male",      ja: "男性",     en: "Male",               emoji: "♂" },
  { id: "other",     ja: "その他",   en: "Other",              emoji: "⚧" },
  { id: "no_answer", ja: "回答しない", en: "Prefer not to say", emoji: "❓" },
] as const;

// Curated suggestion list for country/region search (JP prefectures + common regions).
export const COUNTRY_REGIONS: { ja: string; en: string }[] = [
  { ja: "東京都 千代田区", en: "Chiyoda, Tokyo" },
  { ja: "東京都 中野区",   en: "Nakano, Tokyo" },
  { ja: "東京都 新宿区",   en: "Shinjuku, Tokyo" },
  { ja: "東京都 世田谷区", en: "Setagaya, Tokyo" },
  { ja: "神奈川県 横浜市", en: "Yokohama, Kanagawa" },
  { ja: "神奈川県 川崎市", en: "Kawasaki, Kanagawa" },
  { ja: "大阪府 大阪市",   en: "Osaka City, Osaka" },
  { ja: "京都府 京都市",   en: "Kyoto City, Kyoto" },
  { ja: "北海道 札幌市",   en: "Sapporo, Hokkaido" },
  { ja: "福岡県 福岡市",   en: "Fukuoka City, Fukuoka" },
  { ja: "愛知県 名古屋市", en: "Nagoya, Aichi" },
  { ja: "宮城県 仙台市",   en: "Sendai, Miyagi" },
  { ja: "広島県 広島市",   en: "Hiroshima City, Hiroshima" },
  { ja: "沖縄県 那覇市",   en: "Naha, Okinawa" },
  { ja: "USA - San Francisco",  en: "USA – San Francisco" },
  { ja: "USA - New York",       en: "USA – New York" },
  { ja: "UK - London",          en: "UK – London" },
  { ja: "France - Paris",       en: "France – Paris" },
  { ja: "Germany - Berlin",     en: "Germany – Berlin" },
  { ja: "Singapore",            en: "Singapore" },
  { ja: "Australia - Sydney",   en: "Australia – Sydney" },
];

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
    home_area: p.homeArea ?? p.countryRegion ?? null,
  };
}
