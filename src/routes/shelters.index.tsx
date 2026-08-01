import { createFileRoute, Link } from "@tanstack/react-router";
import { Lightbulb, ChevronRight } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import { ShelterList } from "@/components/ShelterList";

export const Route = createFileRoute("/shelters/")({
  head: () => ({
    meta: [
      { title: "災害・避難所 — みんなの困ったMap" },
      { name: "description", content: "避難所の混雑状況・必要な物資・ペット受け入れ可否をリアルタイムに共有できます。" },
      { property: "og:title", content: "災害・避難所 — みんなの困ったMap" },
      { property: "og:description", content: "避難所の混雑状況・必要な物資・ペット受け入れ可否を共有。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SheltersPage,
});

function SheltersPage() {
  const { lang } = useLang();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold">{t(lang, "災害・避難所", "Disaster / Shelters")}</h1>

      <Link to="/ideas"
        className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 active:scale-[0.995]">
        <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-amber-900">{t(lang, "防災の生活アイデア", "Disaster life ideas")}</div>
          <div className="text-[11px] text-amber-800/80">
            {t(lang, "断水・停電のときに役立つ生活の知恵を共有", "Practical tips for outages and water cuts")}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
      </Link>

      <ShelterList />
    </div>
  );
}

