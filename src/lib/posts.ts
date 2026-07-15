// Shared metadata for the three post types (Happy / Request / Promote).
import { Heart, Flag, Megaphone, type LucideIcon } from "lucide-react";

export type PostType = "happy" | "request" | "promote";

export type PostTypeMeta = {
  type: PostType;
  ja: string;
  en: string;
  color: string;    // main brand color for pins / buttons
  soft: string;     // background tint
  emoji: string;
  icon: LucideIcon;
  actionJa: string; // "I liked this too" / "I agree" / "Like"
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
    ja: "リクエスト", en: "Request",
    color: "#F97316", soft: "#FFEDD5", emoji: "🚩",
    icon: Flag,
    actionJa: "私もそう思う", actionEn: "I agree",
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

export type PostRow = {
  id: string;
  session_id: string;
  type: PostType;
  title: string | null;
  place_label: string | null;
  description: string;
  why_needed: string | null;
  affected_group: string | null;
  when_text: string | null;
  official_url: string | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};
