import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "メンテナンス中 / Under Maintenance — YururiMap" },
      { name: "description", content: "Events page is temporarily under maintenance." },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const { lang } = useLang();
  return (
    <div className="pt-16 text-center space-y-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
        <Wrench className="w-10 h-10 text-amber-600" />
      </div>
      <h2 className="text-xl font-extrabold">{t(lang, "メンテナンス中です", "Under maintenance")}</h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {t(lang, "ただいまイベント機能はメンテナンス中です。しばらくお待ちください。", "The Events feature is temporarily unavailable. Please check back soon.")}
      </p>
    </div>
  );
}
