import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { AlertCircle, ChevronRight, Loader2, Settings } from "lucide-react";

export const Route = createFileRoute("/trouble")({
  head: () => ({
    meta: [
      { title: "困った / Trouble — YururiMap" },
      { name: "description", content: "Report local concerns by category. 地域の困りごとをテーマ別に投稿。" },
    ],
  }),
  component: TroubleIndex,
});

type Category = {
  id: string;
  slug: string;
  name_ja: string;
  name_en: string;
  emoji: string;
  order_index: number;
};

function TroubleIndex() {
  const { lang } = useLang();
  const catQ = useQuery({
    queryKey: ["fixed-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_survey_categories")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-rose-500" />
        <h2 className="text-lg font-bold">{t(lang, "困りごとのテーマを選んでください", "Choose a category")}</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        {t(lang, "あてはまるものをタップしてください", "Tap the one that fits")}
      </p>

      {catQ.isLoading && (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      )}

      <div className="space-y-2">
        {(catQ.data ?? []).map((c, i) => (
          <Link
            key={c.id}
            to="/trouble/$slug"
            params={{ slug: c.slug }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm active:scale-[0.99]"
          >
            <span className="w-7 text-right font-bold text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="text-2xl w-9 text-center">{c.emoji}</span>
            <span className="flex-1 font-semibold">{lang === "ja" ? c.name_ja : c.name_en}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <Link
        to="/admin"
        className="mt-4 inline-flex items-center gap-1 text-[11px] text-muted-foreground"
      >
        <Settings className="w-3 h-3" /> {t(lang, "管理者ログイン", "Admin login")}
      </Link>
    </div>
  );
}
