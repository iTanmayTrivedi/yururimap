import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/life")({
  head: () => ({ meta: [{ title: "暮らし / Life — 準備中" }, { name: "description", content: "Under maintenance" }] }),
  component: LifePage,
});

function LifePage() {
  const { lang } = useLang();
  return (
    <div className="pt-16 flex flex-col items-center text-center gap-4 text-muted-foreground">
      <Home className="w-14 h-14 text-emerald-500" />
      <h2 className="text-lg font-bold text-foreground">{t(lang, "暮らし", "Life")}</h2>
      <p className="text-sm">{t(lang, "この機能は準備中です。近日公開予定！", "This feature is under maintenance. Coming soon!")}</p>
    </div>
  );
}
