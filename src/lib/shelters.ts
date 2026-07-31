// Disaster / shelter metadata shared across the shelter screens.

export type ShelterRow = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  crowdedness: string;
  pet_status: string;
  needed_supplies: string[] | null;
  problem_categories: string[] | null;
  surplus_supplies: string[] | null;
  announcement: string | null;
  info_url: string | null;
  admin_session_id: string | null;
  hidden: boolean;
  created_at: string;
  updated_at: string;
};

export type ShelterPostRow = {
  id: string;
  shelter_id: string;
  session_id: string;
  content: string;
  photo_url: string | null;
  hidden: boolean;
  created_at: string;
};

export const CROWDEDNESS = [
  { id: "empty",    ja: "空きあり",   en: "Space available", color: "#10B981" },
  { id: "moderate", ja: "やや混雑",   en: "Moderate",        color: "#F59E0B" },
  { id: "crowded",  ja: "混雑",       en: "Crowded",         color: "#F97316" },
  { id: "full",     ja: "満員",       en: "Full",            color: "#EF4444" },
  { id: "unknown",  ja: "不明",       en: "Unknown",         color: "#94A3B8" },
] as const;

export const PET_STATUS = [
  { id: "allowed",     ja: "ペット可",       en: "Pets allowed",    color: "#10B981" },
  { id: "conditional", ja: "条件付きで可",   en: "Conditional",     color: "#F59E0B" },
  { id: "not_allowed", ja: "ペット不可",     en: "No pets",         color: "#EF4444" },
  { id: "unknown",     ja: "不明",           en: "Unknown",         color: "#94A3B8" },
] as const;

export const SUPPLY_ITEMS = [
  { id: "water",     ja: "飲料水",       en: "Drinking water", emoji: "💧" },
  { id: "food",      ja: "食料",         en: "Food",           emoji: "🍙" },
  { id: "blanket",   ja: "毛布",         en: "Blankets",       emoji: "🛏" },
  { id: "hygiene",   ja: "衛生用品",     en: "Hygiene supplies", emoji: "🧼" },
  { id: "sanitary",  ja: "生理用品",     en: "Sanitary products", emoji: "🩸" },
  { id: "diaper",    ja: "おむつ",       en: "Diapers",        emoji: "🧷" },
  { id: "formula",   ja: "粉ミルク",     en: "Baby formula",   emoji: "🍼" },
  { id: "medicine",  ja: "медicine",     en: "Medicines",      emoji: "💊" },
  { id: "flashlight",ja: "懐中電灯",     en: "Flashlights",    emoji: "🔦" },
  { id: "battery",   ja: "電池",         en: "Batteries",      emoji: "🔋" },
  { id: "powerbank", ja: "モバイルバッテリー", en: "Power banks", emoji: "🔌" },
  { id: "other",     ja: "その他",       en: "Other",          emoji: "➕" },
];
SUPPLY_ITEMS[7].ja = "医薬品";

export const PROBLEM_ITEMS = [
  { id: "toilet",      ja: "トイレ",       en: "Toilets",           emoji: "🚻" },
  { id: "power",       ja: "停電",         en: "Power outage",      emoji: "💡" },
  { id: "water_out",   ja: "断水",         en: "Water outage",      emoji: "🚰" },
  { id: "charging",    ja: "携帯の充電",   en: "Phone charging",    emoji: "📱" },
  { id: "heat",        ja: "暑さ",         en: "Heat",              emoji: "🥵" },
  { id: "cold",        ja: "寒さ",         en: "Cold",              emoji: "🥶" },
  { id: "information", ja: "情報不足",     en: "Lack of information", emoji: "📢" },
  { id: "medical",     ja: "医療支援",     en: "Medical support",   emoji: "🏥" },
  { id: "elderly",     ja: "高齢者支援",   en: "Elderly support",   emoji: "🧓" },
  { id: "disability",  ja: "障がい者支援", en: "Disability support", emoji: "♿" },
  { id: "pets",        ja: "ペット",       en: "Pets",              emoji: "🐾" },
  { id: "other",       ja: "その他",       en: "Other",             emoji: "➕" },
];

export type ItemMeta = { id: string; ja: string; en: string; emoji: string };

export function itemLabel(list: ItemMeta[], id: string, lang: "ja" | "en"): string {
  const m = list.find((x) => x.id === id);
  if (!m) return id;
  return `${m.emoji} ${lang === "ja" ? m.ja : m.en}`;
}

export function crowdMeta(id: string) {
  return CROWDEDNESS.find((c) => c.id === id) ?? CROWDEDNESS[4];
}
export function petMeta(id: string) {
  return PET_STATUS.find((c) => c.id === id) ?? PET_STATUS[3];
}
