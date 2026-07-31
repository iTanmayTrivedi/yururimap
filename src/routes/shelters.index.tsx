import { createFileRoute } from "@tanstack/react-router";
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
      <ShelterList />
    </div>
  );
}
