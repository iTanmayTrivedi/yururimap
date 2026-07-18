import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/school")({
  head: () => ({ meta: [{ title: "学校 / School — 準備中" }, { name: "description", content: "Under maintenance" }] }),
  component: SchoolPage,
});

function SchoolPage() {
  const { lang } = useLang();
  return (
    <div className="pt-16 flex flex-col items-center text-center gap-4 text-muted-foreground">
      <GraduationCap className="w-14 h-14 text-amber-500" />
      <h2 className="text-lg font-bold text-foreground">{t(lang, "学校", "School")}</h2>
      <p className="text-sm">{t(lang, "この機能は準備中です。近日公開予定！", "This feature is under maintenance. Coming soon!")}</p>
    </div>
  );
}
