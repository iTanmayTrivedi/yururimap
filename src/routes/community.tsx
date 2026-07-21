import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ArrowLeft } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "コミュニティ / Community — YururiMap" },
      { name: "description", content: "Community category — coming soon." },
    ],
  }),
  component: CommunityStub,
});

function CommunityStub() {
  const { lang } = useLang();
  return (
    <div className="pt-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-orange-100 border-2 border-orange-300 mx-auto flex items-center justify-center">
        <Users className="w-8 h-8 text-orange-600" />
      </div>
      <h2 className="text-lg font-extrabold">{t(lang, "コミュニティ", "Community")}</h2>
      <p className="text-sm text-muted-foreground">
        {t(lang, "準備中です。もうしばらくお待ちください。", "Under maintenance — coming soon.")}
      </p>
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "ホームへ戻る", "Back to home")}
      </Link>
    </div>
  );
}
