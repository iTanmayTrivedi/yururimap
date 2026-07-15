import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

// Retained for backward compatibility with other files that import normalizeCode.
const CODE_RE = /^[A-Z0-9_-]{4,32}$/;
export function normalizeCode(raw: string): { code: string | null; reason?: string } {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return { code: null, reason: "コードを入力してください / Please enter a code" };
  if (!CODE_RE.test(trimmed)) return { code: null, reason: "Use A–Z, 0–9, - or _ (4–32 chars)" };
  return { code: trimmed };
}

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "メンテナンス中 / Under Maintenance — YururiMap" },
      { name: "description", content: "Share page is temporarily under maintenance." },
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
        {t(lang, "ただいまつながり機能はメンテナンス中です。しばらくお待ちください。", "The Connect feature is temporarily unavailable. Please check back soon.")}
      </p>
    </div>
  );
}
