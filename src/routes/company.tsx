import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/company")({
  head: () => ({ meta: [{ title: "会社 / Work — 準備中" }, { name: "description", content: "Under maintenance" }] }),
  component: CompanyPage,
});

function CompanyPage() {
  const { lang } = useLang();
  return (
    <div className="pt-16 flex flex-col items-center text-center gap-4 text-muted-foreground">
      <Briefcase className="w-14 h-14 text-sky-500" />
      <h2 className="text-lg font-bold text-foreground">{t(lang, "会社", "Work")}</h2>
      <p className="text-sm">{t(lang, "この機能は準備中です。近日公開予定！", "This feature is under maintenance. Coming soon!")}</p>
    </div>
  );
}
