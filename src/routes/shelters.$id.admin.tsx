/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { CROWDEDNESS, PET_STATUS, SUPPLY_ITEMS, PROBLEM_ITEMS, type ShelterRow } from "@/lib/shelters";
import { ArrowLeft, Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/shelters/$id/admin")({
  head: () => ({
    meta: [
      { title: "避難所の管理 — みんなの困ったMap" },
      { name: "description", content: "避難所の混雑状況・ペット受け入れ・必要物資・お知らせを更新します。" },
      { property: "og:title", content: "避難所の管理 — みんなの困ったMap" },
      { property: "og:description", content: "避難所運営者向けの管理画面です。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShelterAdminPage,
});

function ShelterAdminPage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const qc = useQueryClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<Partial<ShelterRow>>({});
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["shelter", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shelters" as any).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as ShelterRow | null;
    },
  });

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  useEffect(() => {
    (async () => {
      if (q.data === undefined) return;
      const { data } = await supabase.rpc("is_admin");
      setAllowed(!!data || (!!q.data?.admin_session_id && q.data.admin_session_id === getSessionId()));
    })();
  }, [q.data]);

  function toggle(field: "needed_supplies" | "problem_categories" | "surplus_supplies", key: string) {
    setForm((f) => {
      const cur = (f[field] as string[] | null) ?? [];
      return { ...f, [field]: cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key] };
    });
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("shelters" as any).update({
      crowdedness: form.crowdedness,
      pet_status: form.pet_status,
      needed_supplies: form.needed_supplies ?? [],
      problem_categories: form.problem_categories ?? [],
      surplus_supplies: form.surplus_supplies ?? [],
      announcement: form.announcement || null,
      info_url: form.info_url || null,
    } as any).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "保存しました", "Saved"));
    qc.invalidateQueries({ queryKey: ["shelter", id] });
  }

  if (q.isLoading || allowed === null) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!allowed) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t(lang, "この避難所の管理権限がありません", "You don't have admin access to this shelter")}</p>
        <Link to="/shelters/$id" params={{ id }} className="text-xs underline">{t(lang, "戻る", "Back")}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <Link to="/shelters/$id" params={{ id }} className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> {t(lang, "避難所へ戻る", "Back to shelter")}
      </Link>
      <h1 className="text-lg font-extrabold">{q.data?.name}</h1>

      <Box title={t(lang, "混雑状況", "Crowdedness")}>
        <div className="grid grid-cols-2 gap-2">
          {CROWDEDNESS.map((c) => (
            <Pick key={c.id} active={form.crowdedness === c.id} color={c.color}
              label={lang === "ja" ? c.ja : c.en} onClick={() => setForm((f) => ({ ...f, crowdedness: c.id }))} />
          ))}
        </div>
      </Box>

      <Box title={t(lang, "ペット受け入れ", "Pet acceptance")}>
        <div className="grid grid-cols-2 gap-2">
          {PET_STATUS.map((c) => (
            <Pick key={c.id} active={form.pet_status === c.id} color={c.color}
              label={lang === "ja" ? c.ja : c.en} onClick={() => setForm((f) => ({ ...f, pet_status: c.id }))} />
          ))}
        </div>
      </Box>

      <Box title={t(lang, "必要な物資", "Needed supplies")}>
        <div className="grid grid-cols-2 gap-2">
          {SUPPLY_ITEMS.map((s) => (
            <Pick key={s.id} active={(form.needed_supplies ?? []).includes(s.id)} color="#0EA5E9"
              label={`${s.emoji} ${lang === "ja" ? s.ja : s.en}`} onClick={() => toggle("needed_supplies", s.id)} />
          ))}
        </div>
      </Box>

      <Box title={t(lang, "困りごとの項目", "Problem categories")}>
        <div className="grid grid-cols-2 gap-2">
          {PROBLEM_ITEMS.map((s) => (
            <Pick key={s.id} active={(form.problem_categories ?? []).includes(s.id)} color="#F97316"
              label={`${s.emoji} ${lang === "ja" ? s.ja : s.en}`} onClick={() => toggle("problem_categories", s.id)} />
          ))}
        </div>
      </Box>

      <Box title={t(lang, "余っている物資", "Surplus supplies")}>
        <div className="grid grid-cols-2 gap-2">
          {SUPPLY_ITEMS.map((s) => (
            <Pick key={s.id} active={(form.surplus_supplies ?? []).includes(s.id)} color="#10B981"
              label={`${s.emoji} ${lang === "ja" ? s.ja : s.en}`} onClick={() => toggle("surplus_supplies", s.id)} />
          ))}
        </div>
      </Box>

      <Box title={t(lang, "お知らせ", "Announcement")}>
        <textarea rows={3} value={form.announcement ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, announcement: e.target.value.slice(0, 500) }))}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
      </Box>

      <Box title={t(lang, "情報・連絡先URL", "Information / contact URL")}>
        <input value={form.info_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, info_url: e.target.value }))}
          placeholder="https://" className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
      </Box>

      <button onClick={save} disabled={busy}
        className="w-full min-h-[52px] rounded-2xl bg-emerald-600 text-white font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t(lang, "保存する", "Save")}
      </button>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="text-[12px] font-bold">{title}</div>
      {children}
    </div>
  );
}

function Pick({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="min-h-[44px] rounded-xl border text-xs font-bold px-2 truncate"
      style={active
        ? { backgroundColor: color, color: "#fff", borderColor: color }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
      {label}
    </button>
  );
}
