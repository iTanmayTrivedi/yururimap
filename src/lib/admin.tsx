/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared admin (moderation) helpers: session-based super-admin detection plus
// inline moderation controls that appear on top of any post while logged in.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff, Pencil, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";

export type ModTable = "posts" | "activities" | "shelter_posts" | "shelters" | "disaster_ideas";

export function useIsAdmin() {
  const q = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) return false;
      return !!data;
    },
    staleTime: 5 * 60_000,
  });
  return { isAdmin: !!q.data, isLoading: q.isLoading };
}

/** Trash / hide-unhide / edit buttons shown to admins on each item. */
export function ModerationBar({
  table, id, hidden, invalidate, onEdit, compact,
}: {
  table: ModTable;
  id: string;
  hidden?: boolean;
  invalidate?: string[][];
  onEdit?: () => void;
  compact?: boolean;
}) {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  function refresh() {
    for (const key of invalidate ?? []) qc.invalidateQueries({ queryKey: key });
  }

  async function toggleHidden(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from(table as any).update({ hidden: !hidden } as any).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(hidden ? t(lang, "再公開しました", "Published again") : t(lang, "非公開にしました", "Unpublished"));
    refresh();
  }

  async function remove(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    if (!window.confirm(t(lang, "この投稿を完全に削除しますか？", "Permanently delete this post?"))) return;
    setBusy(true);
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t(lang, "削除しました", "Deleted"));
    refresh();
  }

  const cls = `inline-flex items-center justify-center rounded-lg border border-border bg-card ${
    compact ? "w-7 h-7" : "w-8 h-8"}`;
  const icon = compact ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {busy && <Loader2 className={`${icon} animate-spin text-muted-foreground`} />}
      <button type="button" onClick={remove} disabled={busy} className={`${cls} text-red-500`}
        aria-label={t(lang, "削除", "Delete")} title={t(lang, "削除", "Delete")}>
        <Trash2 className={icon} />
      </button>
      <button type="button" onClick={toggleHidden} disabled={busy} className={`${cls} text-muted-foreground`}
        aria-label={hidden ? t(lang, "再公開", "Publish") : t(lang, "非公開", "Unpublish")}
        title={hidden ? t(lang, "再公開", "Publish") : t(lang, "非公開", "Unpublish")}>
        {hidden ? <Eye className={icon} /> : <EyeOff className={icon} />}
      </button>
      {onEdit && (
        <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
          className={`${cls} text-sky-500`} aria-label={t(lang, "修正", "Edit")} title={t(lang, "修正", "Edit")}>
          <Pencil className={icon} />
        </button>
      )}
    </div>
  );
}

export type EditField = { key: string; label: string; value: string; multiline?: boolean };

/** Generic admin edit sheet: edits the given text fields of one row. */
export function AdminEditDialog({
  open, table, id, fields, invalidate, onClose,
}: {
  open: boolean;
  table: ModTable;
  id: string;
  fields: EditField[];
  invalidate?: string[][];
  onClose: () => void;
}) {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [vals, setVals] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function save() {
    setBusy(true);
    const patch: Record<string, any> = {};
    for (const f of fields) patch[f.key] = vals[f.key] ?? f.value;
    const { error } = await supabase.from(table as any).update(patch as any).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t(lang, "修正しました", "Updated"));
    for (const key of invalidate ?? []) qc.invalidateQueries({ queryKey: key });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[430px] bg-card rounded-t-3xl p-4 space-y-3 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">{t(lang, "投稿を修正（管理者）", "Edit post (admin)")}</div>
          <button onClick={onClose} aria-label="close" className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        {fields.map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground">{f.label}</span>
            {f.multiline ? (
              <textarea rows={4} value={vals[f.key] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm" />
            ) : (
              <input value={vals[f.key] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm" />
            )}
          </label>
        ))}
        <button onClick={save} disabled={busy}
          className="w-full min-h-[48px] rounded-2xl bg-sky-500 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t(lang, "保存する", "Save")}
        </button>
      </div>
    </div>
  );
}
