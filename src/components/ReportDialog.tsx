import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session";
import { useLang, t } from "@/lib/i18n";
import { X, Loader2, Flag } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  target: { post_id?: string; activity_id?: string; resolution_id?: string };
};

export function ReportDialog({ open, onClose, target }: Props) {
  const { lang } = useLang();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function submit() {
    setBusy(true);
    try {
      const { error } = await supabase.from("post_reports").insert({
        session_id: getSessionId(),
        reason: reason.trim().slice(0, 500) || null,
        post_id: target.post_id ?? null,
        activity_id: target.activity_id ?? null,
        resolution_id: target.resolution_id ?? null,
      });
      if (error) throw error;
      toast.success(t(lang, "通報しました。ありがとうございます。", "Reported. Thank you."));
      setReason("");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm inline-flex items-center gap-1.5"><Flag className="w-4 h-4 text-red-500" />
            {t(lang, "不適切な投稿を通報", "Report inappropriate post")}
          </h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 500))}
          rows={4} placeholder={t(lang, "理由（任意）", "Reason (optional)")}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm resize-none" />
        <button onClick={submit} disabled={busy}
          className="w-full min-h-[44px] rounded-xl bg-red-500 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
          {t(lang, "通報する", "Submit report")}
        </button>
      </div>
    </div>
  );
}
