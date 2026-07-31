/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, PawPrint, Users, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import {
  SUPPLY_ITEMS, itemLabel, crowdMeta, petMeta, type ShelterRow,
} from "@/lib/shelters";

export function ShelterList() {
  const { lang } = useLang();

  const q = useQuery({
    queryKey: ["shelters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shelters" as any)
        .select("*").eq("hidden", false).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ShelterRow[];
    },
  });

  if (q.isLoading) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  const shelters = q.data ?? [];
  if (shelters.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t(lang, "登録されている避難所はまだありません", "No shelters registered yet")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shelters.map((s) => {
        const c = crowdMeta(s.crowdedness);
        const p = petMeta(s.pet_status);
        const needs = s.needed_supplies ?? [];
        return (
          <Link key={s.id} to="/shelters/$id" params={{ id: s.id }}
            className="block rounded-2xl border border-border bg-card p-3 shadow-sm active:scale-[0.995]">
            <div className="font-extrabold text-sm">{s.name}</div>
            {s.address && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" /> <span className="truncate">{s.address}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge color={c.color} icon={<Users className="w-3 h-3" />}
                label={lang === "ja" ? c.ja : c.en} />
              <Badge color={p.color} icon={<PawPrint className="w-3 h-3" />}
                label={lang === "ja" ? p.ja : p.en} />
            </div>
            <div className="flex items-start gap-1 mt-2 text-[11px]">
              <Package className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                {needs.length
                  ? needs.map((n) => itemLabel(SUPPLY_ITEMS, n, lang)).join(" / ")
                  : t(lang, "不足している物資はありません", "No supplies needed")}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Badge({ color, label, icon }: { color: string; label: string; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}>
      {icon}{label}
    </span>
  );
}
