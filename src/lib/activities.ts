import {
  Users, Baby, GraduationCap, Briefcase, Leaf, HandHelping, PawPrint, Palette, MoreHorizontal,
  MapPin, Globe, Monitor, type LucideIcon,
} from "lucide-react";

/* ---------- legacy activity "types" (kept for existing rows) ---------- */
export type ActivityType = "meetup" | "join" | "create" | "space" | "protect" | "support";

export type ActivityTypeMeta = {
  type: ActivityType;
  ja: string; en: string;
  color: string; soft: string;
  icon: LucideIcon;
};

export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeMeta> = {
  meetup:  { type: "meetup",  ja: "交流会",   en: "Meetups",    color: "#0EA5E9", soft: "#E0F2FE", icon: Users },
  join:    { type: "join",    ja: "参加する", en: "Join",       color: "#F59E0B", soft: "#FEF3C7", icon: HandHelping },
  create:  { type: "create",  ja: "作る",     en: "Create",     color: "#8B5CF6", soft: "#EDE9FE", icon: Palette },
  space:   { type: "space",   ja: "居場所",   en: "Spaces",     color: "#10B981", soft: "#D1FAE5", icon: Users },
  protect: { type: "protect", ja: "保護",     en: "Protection", color: "#EF4444", soft: "#FEE2E2", icon: PawPrint },
  support: { type: "support", ja: "支援",     en: "Support",    color: "#EC4899", soft: "#FCE7F3", icon: HandHelping },
};
export const ACTIVITY_TYPE_LIST = Object.values(ACTIVITY_TYPES);

/* ---------- activity categories (current spec: 9 items) ---------- */
export type ActivityCategoryId =
  | "community" | "childcare" | "education" | "work" | "environment"
  | "volunteer" | "animals" | "culture" | "other";

export type ActivityCategoryMeta = {
  id: ActivityCategoryId;
  ja: string; en: string;
  color: string; soft: string;
  icon: LucideIcon;
};

export const ACTIVITY_CATEGORIES: Record<ActivityCategoryId, ActivityCategoryMeta> = {
  community:   { id: "community",   ja: "地域・まちづくり", en: "Community",   color: "#10B981", soft: "#D1FAE5", icon: Users },
  childcare:   { id: "childcare",   ja: "子育て",           en: "Parenting",   color: "#EC4899", soft: "#FCE7F3", icon: Baby },
  education:   { id: "education",   ja: "教育・学び",       en: "Education",   color: "#8B5CF6", soft: "#EDE9FE", icon: GraduationCap },
  work:        { id: "work",        ja: "仕事・働き方",     en: "Work",        color: "#3B82F6", soft: "#DBEAFE", icon: Briefcase },
  environment: { id: "environment", ja: "環境・自然",       en: "Environment", color: "#22C55E", soft: "#DCFCE7", icon: Leaf },
  volunteer:   { id: "volunteer",   ja: "ボランティア・支援", en: "Volunteer", color: "#F59E0B", soft: "#FEF3C7", icon: HandHelping },
  animals:     { id: "animals",     ja: "動物",             en: "Animals",     color: "#F97316", soft: "#FFEDD5", icon: PawPrint },
  culture:     { id: "culture",     ja: "文化・スポーツ",   en: "Culture & Sports", color: "#06B6D4", soft: "#CFFAFE", icon: Palette },
  other:       { id: "other",       ja: "その他",           en: "Other",       color: "#6B7280", soft: "#F3F4F6", icon: MoreHorizontal },
};
export const ACTIVITY_CATEGORY_LIST = Object.values(ACTIVITY_CATEGORIES);

export function activityCategoryOf(id: string | null | undefined): ActivityCategoryMeta {
  return (id && ACTIVITY_CATEGORIES[id as ActivityCategoryId]) || ACTIVITY_CATEGORIES.other;
}

/* ---------- scope: 地域 / 全国 / オンライン ---------- */
export type ActivityScope = "local" | "national" | "online" | "single" | "regional" | "global";

export const SCOPES: { id: ActivityScope; ja: string; en: string; icon: LucideIcon; hint_ja: string; hint_en: string }[] = [
  { id: "local",    ja: "地域",       en: "Local",    icon: MapPin,  hint_ja: "場所を指定します", hint_en: "Pick a place" },
  { id: "national", ja: "全国",       en: "National", icon: Globe,   hint_ja: "日本全国が対象",   hint_en: "Nationwide" },
  { id: "online",   ja: "オンライン", en: "Online",   icon: Monitor, hint_ja: "どこからでも参加", hint_en: "Join from anywhere" },
];

export function scopeGroup(scope: ActivityScope): "local" | "national" | "online" {
  if (scope === "online") return "online";
  if (scope === "national" || scope === "global") return "national";
  return "local";
}

export type ActivityStatus = "draft" | "pending" | "approved" | "rejected";

export type ActivityRow = {
  id: string;
  session_id: string;
  status: ActivityStatus;
  activity_type: ActivityType;
  category: string | null;
  title: string;
  description: string;
  scope: ActivityScope;
  place_label: string | null;
  lat: number | null;
  lng: number | null;
  official_url: string | null;
  apply_url: string | null;
  homepage_url: string | null;
  donation_url: string | null;
  photo_url: string | null;
  hidden: boolean;
  created_at: string;
  updated_at: string;
};
