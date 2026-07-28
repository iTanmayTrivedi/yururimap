// Shared metadata for problem posts.
import { Heart, Flag, Megaphone, Home, Briefcase, Repeat, Plane, HelpCircle, type LucideIcon } from "lucide-react";

export type PostType = "happy" | "request" | "promote";

export type PostTypeMeta = {
  type: PostType;
  ja: string;
  en: string;
  color: string;
  soft: string;
  emoji: string;
  icon: LucideIcon;
  actionJa: string;
  actionEn: string;
};

export const POST_TYPES: Record<PostType, PostTypeMeta> = {
  happy: {
    type: "happy",
    ja: "よかった投稿", en: "Happy post",
    color: "#EC4899", soft: "#FCE7F3", emoji: "💗",
    icon: Heart,
    actionJa: "私もよかった", actionEn: "I liked this too",
  },
  request: {
    type: "request",
    ja: "困った", en: "Problem",
    color: "#38BDF8", soft: "#E0F2FE", emoji: "🔵",
    icon: Flag,
    actionJa: "私も困ってる", actionEn: "I have this problem too",
  },
  promote: {
    type: "promote",
    ja: "活動を広める", en: "Promote activity",
    color: "#10B981", soft: "#D1FAE5", emoji: "📣",
    icon: Megaphone,
    actionJa: "いいね", actionEn: "Like",
  },
};

export const POST_TYPE_LIST: PostTypeMeta[] = [POST_TYPES.happy, POST_TYPES.request, POST_TYPES.promote];

/** この場所との関係 — button-style selection on the problem form. */
export type PlaceRelationId = "living" | "working" | "frequent" | "visiting" | "no_answer";

export const PLACE_RELATIONS: { id: PlaceRelationId; ja: string; en: string; icon: LucideIcon }[] = [
  { id: "living",    ja: "住んでいる",         en: "I live here",        icon: Home },
  { id: "working",   ja: "働いている・通学",   en: "I work / study here", icon: Briefcase },
  { id: "frequent",  ja: "よく利用する",       en: "I use it often",     icon: Repeat },
  { id: "visiting",  ja: "訪れた・旅行中",     en: "Visiting / traveling", icon: Plane },
  { id: "no_answer", ja: "回答しない",         en: "Prefer not to say",  icon: HelpCircle },
];

export function placeRelationLabel(id: string | null | undefined, lang: "ja" | "en"): string | null {
  const r = PLACE_RELATIONS.find((x) => x.id === id);
  if (!r) return null;
  return lang === "ja" ? r.ja : r.en;
}

export type PostRow = {
  id: string;
  session_id: string;
  type: PostType;
  category: string | null;
  subtopic: string | null;
  title: string | null;
  place_label: string | null;
  description: string;
  why_needed: string | null;
  affected_group: string | null;
  place_relation: string | null;
  when_text: string | null;
  official_url: string | null;
  photo_url: string | null;
  thanks_count: number | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};
