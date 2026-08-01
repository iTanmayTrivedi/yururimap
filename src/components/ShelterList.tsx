/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, PawPrint, Users, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { useIsAdmin, ModerationBar, AdminEditDialog } from "@/lib/admin";
import {
  SUPPLY_ITEMS, itemLabel, crowdMeta, petMeta, type ShelterRow,
} from "@/lib/shelters";

export function ShelterList() {
  const { lang } = useLang();
  const { isAdmin } = useIsAdmin();
  const [editTarget, setEditTarget] = useState<ShelterRow | null>(null);

  const q = useQuery({
    queryKey: ["shelters", isAdmin],
    queryFn: async () => {
      let query = supabase.from("shelters" as any).select("*");
      if (!isAdmin) query = query.eq("hidden", false);
      const { data, error } = await query.order("name");
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
          <div key={s.id} className="relative">
            <Link to="/shelters/$id" params={{ id: s.id }}
              className="block rounded-2xl border border-border bg-card p-3 shadow-sm active:scale-[0.995]"
              style={{ opacity: s.hidden ? 0.55 : 1 }}>
              <div className={`font-extrabold text-sm ${isAdmin ? "pr-24" : ""}`}>{s.name}</div>
              {s.hidden && (
                <div className="text-[10px] font-bold text-muted-foreground">{t(lang, "非公開", "Unpublished")}</div>
              )}
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
            {isAdmin && (
              <div className="absolute top-1.5 right-1.5">
                <ModerationBar table="shelters" id={s.id} hidden={s.hidden} compact
                  invalidate={[["shelters"]]} onEdit={() => setEditTarget(s)} />
              </div>
            )}
          </div>
        );
      })}

      {editTarget && (
        <AdminEditDialog open table="shelters" id={editTarget.id}
          fields={[
            { key: "name", label: t(lang, "避難所名", "Shelter name"), value: editTarget.name },
            { key: "address", label: t(lang, "住所", "Address"), value: editTarget.address ?? "" },
            { key: "announcement", label: t(lang, "お知らせ", "Announcement"), value: editTarget.announcement ?? "", multiline: true },
          ]}
          invalidate={[["shelters"]]} onClose={() => setEditTarget(null)} />
      )}
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
