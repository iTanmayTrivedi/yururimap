import { Users, HandHelping, Hammer, Home, PawPrint, HeartHandshake, type LucideIcon } from "lucide-react";

export type ActivityType = "meetup" | "join" | "create" | "space" | "protect" | "support";
export type ActivityScope = "single" | "local" | "regional" | "national" | "global";
export type ActivityStatus = "draft" | "pending" | "approved" | "rejected";

export type ActivityTypeMeta = {
  type: ActivityType;
  ja: string; en: string;
  color: string; soft: string;
  icon: LucideIcon;
};

export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeMeta> = {
  meetup:  { type: "meetup",  ja: "交流会",   en: "Meetups",       color: "#0EA5E9", soft: "#E0F2FE", icon: Users },
  join:    { type: "join",    ja: "参加する", en: "Join",          color: "#F59E0B", soft: "#FEF3C7", icon: HandHelping },
  create:  { type: "create",  ja: "作る",     en: "Create",        color: "#8B5CF6", soft: "#EDE9FE", icon: Hammer },
  space:   { type: "space",   ja: "居場所",   en: "Spaces",        color: "#10B981", soft: "#D1FAE5", icon: Home },
  protect: { type: "protect", ja: "保護",     en: "Protection",    color: "#EF4444", soft: "#FEE2E2", icon: PawPrint },
  support: { type: "support", ja: "支援",     en: "Support",       color: "#EC4899", soft: "#FCE7F3", icon: HeartHandshake },
};
export const ACTIVITY_TYPE_LIST = Object.values(ACTIVITY_TYPES);

export const SCOPES: { id: ActivityScope; ja: string; en: string }[] = [
  { id: "single",   ja: "1地点",   en: "Single spot" },
  { id: "local",    ja: "地域",     en: "Local" },
  { id: "regional", ja: "地方",     en: "Regional" },
  { id: "national", ja: "全国",     en: "Nationwide" },
  { id: "global",   ja: "世界",     en: "Worldwide" },
];

export type ActivityRow = {
  id: string;
  session_id: string;
  status: ActivityStatus;
  activity_type: ActivityType;
  title: string;
  description: string;
  scope: ActivityScope;
  place_label: string | null;
  lat: number | null;
  lng: number | null;
  official_url: string | null;
  photo_url: string | null;
  hidden: boolean;
  created_at: string;
  updated_at: string;
};
