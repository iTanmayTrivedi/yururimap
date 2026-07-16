import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, t } from "@/lib/i18n";
import { FileText, ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "利用規約・プライバシーポリシー / Terms & Privacy — YururiMap" },
      { name: "description", content: "YururiMap terms of use and privacy policy." },
    ],
  }),
  component: TermsPage,
});

const TERMS_JA = [
  "公序良俗に反する投稿は禁止します。",
  "他人を誹謗中傷する投稿は禁止します。",
  "運営は、不適切な投稿を削除する場合があります。",
  "イベントや団体での利用（共有コードの発行）は、事前に運営の承認が必要です。",
  "運営が不適切と判断したイベントや活動は、掲載をお断りする、または削除する場合があります。",
];

const PRIVACY_JA = [
  "ログインは不要です。",
  "年代・性別・居住地域は任意で入力できます。",
  "位置情報は、利用者が許可した場合のみ利用します。",
  "投稿内容は、地域課題の可視化や統計分析に利用します。",
  "個人を特定する目的では利用しません。",
  "お問い合わせや認証手続きなどで、必要に応じて氏名・メールアドレス等をご提供いただく場合があります。",
];

const TERMS_EN = [
  "Posts that violate public order or morality are prohibited.",
  "Posts that slander or defame others are prohibited.",
  "The operator may remove inappropriate posts.",
  "Use by events or organizations (issuance of a shared code) requires prior approval from the operator.",
  "Events or activities judged inappropriate by the operator may be declined or removed.",
];

const PRIVACY_EN = [
  "No login is required.",
  "Age group, gender, and home area are optional.",
  "Location is only used when the user grants permission.",
  "Post contents are used to visualize community issues and for statistical analysis.",
  "We do not use data to identify individuals.",
  "We may ask for your name, email, etc. as needed for inquiries or verification.",
];

function TermsPage() {
  const { lang } = useLang();
  const terms = lang === "ja" ? TERMS_JA : TERMS_EN;
  const privacy = lang === "ja" ? PRIVACY_JA : PRIVACY_EN;
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">{t(lang, "利用規約・プライバシーポリシー", "Terms & Privacy")}</h2>
        <p className="text-xs text-muted-foreground">Terms of Use &amp; Privacy Policy</p>
      </div>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-extrabold text-rose-800">{t(lang, "利用規約", "Terms of Use")}</h3>
        </div>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-rose-900/90 list-disc pl-5">
          {terms.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-extrabold text-emerald-800">{t(lang, "プライバシーポリシー", "Privacy Policy")}</h3>
        </div>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-emerald-900/90 list-disc pl-5">
          {privacy.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800 text-center">
        🦦 {t(lang, "みんなの声で、ゆるやか暮らしをもっとよくしていきましょう。", "Together we build a gentler, kinder neighborhood.")}
      </div>

      <Link to="/my" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "マイページへ戻る", "Back to My Page")}
      </Link>
    </div>
  );
}
