import { useState } from "react";
import { toast } from "sonner";
import { X, Send, Loader2, MessageCircleHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session";
import { useLang, t } from "@/lib/i18n";

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    const msg = message.trim();
    if (msg.length < 1) {
      toast.error(t(lang, "内容を入力してください", "Please write something"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      session_id: getSessionId(),
      message: msg.slice(0, 2000),
      email: email.trim().slice(0, 200) || null,
      lang,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "送信しました。ありがとうございます！", "Sent. Thank you!"));
    setMessage(""); setEmail("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-[430px] bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-xl p-5 space-y-3 animate-in slide-in-from-bottom-4 duration-200"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full flex items-center justify-center bg-pink-100">
            <MessageCircleHeart className="w-5 h-5 text-pink-600" />
          </span>
          <div className="flex-1">
            <div className="text-base font-bold">{t(lang, "ご意見・ご感想", "Feedback")}</div>
            <div className="text-[11px] text-muted-foreground">{t(lang, "改善のヒントをぜひ教えてください", "We'd love your thoughts")}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label="close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          rows={5}
          placeholder={t(lang, "気づいたこと、要望、感想など自由にどうぞ", "Anything you noticed, wish for, or liked")}
          className="w-full px-3 py-2 rounded-xl border border-input bg-card text-sm"
        />
        <div className="text-[10px] text-right text-muted-foreground">{message.length}/2000</div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.slice(0, 200))}
          placeholder={t(lang, "メール（任意 / 返信が必要な場合）", "Email (optional, for a reply)")}
          className="w-full min-h-[44px] px-3 rounded-xl border border-input bg-card text-sm"
        />

        <button
          onClick={submit}
          disabled={busy}
          className="w-full min-h-[48px] rounded-xl text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: "#EC4899" }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t(lang, "送信する", "Send")}
        </button>
      </div>
    </div>
  );
}
