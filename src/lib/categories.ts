// 4-category taxonomy for Minna no Komatta Map.
// Kurashi (Living) / Community / Business / Education.
import {
  Home, Users, Briefcase, GraduationCap,
  Baby, Stethoscope, HeartHandshake, Building2, FileText, Car, Trees, ShieldAlert, PawPrint,
  PartyPopper, HandHelping, HeartPulse, Megaphone, UserPlus, Coins,
  Users2, UserSearch, TrendingUp, Wrench, Cpu, Handshake, Scale,
  School, BookOpen, User as UserIcon, Frown, Trophy, HomeIcon as Home2,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type CategoryId = "kurashi" | "community" | "business" | "education";

export type CategoryMeta = {
  id: CategoryId;
  ja: string;
  en: string;
  color: string;
  soft: string;
  emoji: string;
  icon: LucideIcon;
  /** Whether photos are allowed for posts in this category (business/education = no per spec). */
  photoAllowed: boolean;
};

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  kurashi:   { id: "kurashi",   ja: "暮らし",       en: "Living",    color: "#10B981", soft: "#D1FAE5", emoji: "🏠", icon: Home,          photoAllowed: true },
  community: { id: "community", ja: "コミュニティ", en: "Community", color: "#F97316", soft: "#FFEDD5", emoji: "👨‍👩‍👧", icon: Users,         photoAllowed: true },
  business:  { id: "business",  ja: "ビジネス",     en: "Business",  color: "#3B82F6", soft: "#DBEAFE", emoji: "🏢", icon: Briefcase,     photoAllowed: false },
  education: { id: "education", ja: "教育",         en: "Education", color: "#8B5CF6", soft: "#EDE9FE", emoji: "🏫", icon: GraduationCap, photoAllowed: false },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export type Subtopic = { id: string; ja: string; en: string; icon: LucideIcon };

export const SUBTOPICS: Record<CategoryId, Subtopic[]> = {
  kurashi: [
    { id: "childcare",     ja: "子育て",         en: "Childcare",           icon: Baby },
    { id: "medical",       ja: "医療・健康",     en: "Medical & Health",    icon: Stethoscope },
    { id: "welfare",       ja: "介護・福祉",     en: "Care & Welfare",      icon: HeartHandshake },
    { id: "housing",       ja: "住まい",         en: "Housing",             icon: Building2 },
    { id: "tax",           ja: "税金・手続き",   en: "Taxes & Paperwork",   icon: FileText },
    { id: "roads",         ja: "道路・交通",     en: "Roads & Traffic",     icon: Car },
    { id: "parks",         ja: "公園・公共施設", en: "Parks & Public",      icon: Trees },
    { id: "safety",        ja: "防災・防犯",     en: "Disaster & Crime",    icon: ShieldAlert },
    { id: "animals",       ja: "動物・環境",     en: "Animals & Env.",      icon: PawPrint },
    { id: "other",         ja: "その他",         en: "Other",               icon: MoreHorizontal },
  ],
  community: [
    { id: "events",        ja: "地域イベント",         en: "Local events",         icon: PartyPopper },
    { id: "volunteer",     ja: "ボランティア・支援",   en: "Volunteer & support",  icon: HandHelping },
    { id: "operations",    ja: "地域の活動・運営",     en: "Community operations", icon: Users },
    { id: "parenting",     ja: "子育て支援・親の交流", en: "Parent support",       icon: Baby },
    { id: "seniors",       ja: "高齢者・見守り",       en: "Elder care & watch",   icon: HeartPulse },
    { id: "outreach",      ja: "情報発信・広報",       en: "Info & outreach",      icon: Megaphone },
    { id: "recruit",       ja: "仲間募集・作り",       en: "Recruit members",      icon: UserPlus },
    { id: "funding",       ja: "資金・寄付の募集",     en: "Funding & donations",  icon: Coins },
    { id: "other",         ja: "その他",               en: "Other",                icon: MoreHorizontal },
  ],
  business: [
    { id: "work_env",      ja: "働き方・労働環境", en: "Work environment",  icon: Users2 },
    { id: "hiring",        ja: "採用・人材",       en: "Hiring & talent",   icon: UserSearch },
    { id: "management",    ja: "経営・資金繰り",   en: "Management & finance", icon: TrendingUp },
    { id: "workplace",     ja: "職場環境・設備",   en: "Workplace & tools", icon: Wrench },
    { id: "dx",            ja: "仕事の効率化・DX", en: "Efficiency & DX",   icon: Cpu },
    { id: "sales",         ja: "取引・営業",       en: "Sales & partnerships", icon: Handshake },
    { id: "legal",         ja: "法務・手続き・行政", en: "Legal & admin",   icon: Scale },
    { id: "other",         ja: "その他",           en: "Other",             icon: MoreHorizontal },
  ],
  education: [
    { id: "facilities",    ja: "学校の設備・環境", en: "School facilities", icon: School },
    { id: "learning",      ja: "学習・進路",       en: "Learning & careers", icon: BookOpen },
    { id: "teachers",      ja: "先生・人員",       en: "Teachers & staff",  icon: UserIcon },
    { id: "bullying",      ja: "いじめ・不登校",   en: "Bullying & absence", icon: Frown },
    { id: "club",          ja: "部活動・課外活動", en: "Clubs & activities", icon: Trophy },
    { id: "home",          ja: "子育て・家庭学習", en: "Home learning",     icon: Home2 },
    { id: "other",         ja: "その他",           en: "Other",             icon: MoreHorizontal },
  ],
};

export function categoryOf(id: string | null | undefined): CategoryMeta | null {
  if (!id) return null;
  return (CATEGORIES as Record<string, CategoryMeta>)[id] ?? null;
}

export function subtopicOf(catId: CategoryId | null | undefined, subId: string | null | undefined) {
  if (!catId || !subId) return null;
  return SUBTOPICS[catId]?.find((s) => s.id === subId) ?? null;
}

// Affected-group options per spec. Business uses a distinct list.
export type AffectedOption = { id: string; ja: string; en: string; emoji: string };

export const AFFECTED_DEFAULT: AffectedOption[] = [
  { id: "child",     ja: "子ども",       en: "Children",   emoji: "🧒" },
  { id: "adult",     ja: "大人",         en: "Adults",     emoji: "🧑" },
  { id: "elder",     ja: "高齢者",       en: "Elderly",    emoji: "👵" },
  { id: "disabled",  ja: "障害のある方", en: "Disabled",   emoji: "♿" },
  { id: "everyone",  ja: "みんな",       en: "Everyone",   emoji: "👨‍👩‍👧" },
  { id: "foreigner", ja: "外国の方",     en: "Foreigners", emoji: "🌐" },
];

export const AFFECTED_BUSINESS: AffectedOption[] = [
  { id: "solo",      ja: "個人事業主",             en: "Sole trader",   emoji: "🧑‍💼" },
  { id: "small",     ja: "中小企業",               en: "Small biz",     emoji: "🏬" },
  { id: "large",     ja: "中堅・大企業",           en: "Large biz",     emoji: "🏢" },
  { id: "startup",   ja: "スタートアップ・ベンチャー", en: "Startup",   emoji: "🚀" },
  { id: "org",       ja: "団体・組織",             en: "NPO / org.",    emoji: "🤝" },
  { id: "other",     ja: "その他",                 en: "Other",         emoji: "…" },
];

export const AFFECTED_EDUCATION: AffectedOption[] = [
  { id: "student",   ja: "子ども・生徒", en: "Students",   emoji: "🧑‍🎓" },
  { id: "parent",    ja: "保護者",       en: "Parents",    emoji: "👨‍👩‍👦" },
  { id: "teacher",   ja: "先生",         en: "Teachers",   emoji: "🧑‍🏫" },
  { id: "foreign",   ja: "外国ルーツ",   en: "Foreign-root", emoji: "🌐" },
  { id: "everyone",  ja: "みんな",       en: "Everyone",   emoji: "👥" },
  { id: "other",     ja: "その他",       en: "Other",      emoji: "…" },
];

export function affectedOptionsFor(cat: CategoryId): AffectedOption[] {
  if (cat === "business") return AFFECTED_BUSINESS;
  if (cat === "education") return AFFECTED_EDUCATION;
  return AFFECTED_DEFAULT;
}
