import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Settings, Info } from "lucide-react";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "その他 / More" },
      { name: "description", content: "Settings, feedback, and about." },
    ],
  }),
  component: MorePage,
});

const items = [
  { Icon: MessageSquare, ja: "ご意見・ご要望", en: "Feedback" },
  { Icon: Settings,      ja: "設定",          en: "Settings" },
  { Icon: Info,          ja: "このアプリについて", en: "About this app" },
];

function MorePage() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">その他</h2>
        <p className="text-sm text-muted-foreground">More</p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm divide-y divide-border">
        {items.map(({ Icon, ja, en }) => (
          <div key={ja} className="flex items-center gap-3 px-4 py-4 opacity-80">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-muted shrink-0">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-medium">{ja}</span>
              <span className="block text-[11px] text-muted-foreground">{en}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              メンテナンス中
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground pt-2">
        各メニューは今後、順次機能を追加・アップデートしていきます。<br />
        These menus will be added in upcoming updates.
      </p>
    </div>
  );
}
