import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { Loader2, ShieldCheck, Lock, Plus, Trash2, Save, MapPin, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "管理者 / Admin — YururiMap" },
      { name: "description", content: "Admin console for fixed surveys." },
    ],
  }),
  component: AdminPage,
});

type Category = { id: string; slug: string; name_ja: string; name_en: string; emoji: string };
type Survey = { id: string; category_id: string; title: string; description: string | null };
type Question = { id: string; survey_id: string; label: string; order_index: number; location_enabled: boolean };

function AdminPage() {
  const { lang } = useLang();
  const qc = useQueryClient();

  const isAdminQ = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data === true;
    },
    refetchOnWindowFocus: false,
  });

  const [pass, setPass] = useState("");
  const [claiming, setClaiming] = useState(false);
  async function claim() {
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_admin", { _passphrase: pass });
      if (error) throw error;
      if (data === true) {
        toast.success(t(lang, "管理者になりました", "You are now admin"));
        qc.invalidateQueries({ queryKey: ["is-admin"] });
      } else {
        toast.error(t(lang, "パスフレーズが違います", "Wrong passphrase"));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setClaiming(false);
    }
  }

  if (isAdminQ.isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  if (!isAdminQ.data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-bold">{t(lang, "管理者ログイン", "Admin login")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(lang,
            "管理者パスフレーズを入力してください。管理者のみが固定アンケートを編集できます。",
            "Enter the admin passphrase. Only admins can edit the fixed surveys.")}
        </p>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder={t(lang, "パスフレーズ", "Passphrase")}
          className="w-full min-h-[44px] px-3 rounded-xl border border-input bg-card"
        />
        <button
          disabled={!pass || claiming}
          onClick={claim}
          className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t(lang, "ログイン", "Sign in")}
        </button>
        <Link to="/trouble" className="block text-center text-xs text-muted-foreground mt-2">
          <ArrowLeft className="w-3 h-3 inline" /> {t(lang, "困ったに戻る", "Back to Trouble")}
        </Link>
      </div>
    );
  }

  return <AdminSurveys />;
}

function AdminSurveys() {
  const { lang } = useLang();
  const catQ = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fixed_survey_categories").select("*").order("order_index");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
  const [openCat, setOpenCat] = useState<Category | null>(null);

  if (openCat) return <SurveyEditor cat={openCat} onBack={() => setOpenCat(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold">{t(lang, "アンケート管理", "Survey management")}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(lang, "カテゴリを選んでアンケートを編集します。", "Choose a category to edit its survey.")}
      </p>
      {catQ.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      <div className="space-y-2">
        {(catQ.data ?? []).map((c, i) => (
          <button
            key={c.id}
            onClick={() => setOpenCat(c)}
            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm active:scale-[0.99] text-left"
          >
            <span className="w-6 text-right font-bold text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="text-2xl w-9 text-center">{c.emoji}</span>
            <span className="flex-1 font-semibold">{lang === "ja" ? c.name_ja : c.name_en}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SurveyEditor({ cat, onBack }: { cat: Category; onBack: () => void }) {
  const { lang } = useLang();
  const qc = useQueryClient();

  const surveyQ = useQuery({
    queryKey: ["admin-survey", cat.id],
    queryFn: async () => {
      const { data: s } = await supabase.from("fixed_surveys").select("*").eq("category_id", cat.id).maybeSingle();
      if (!s) return { survey: null as Survey | null, questions: [] as Question[] };
      const { data: qs } = await supabase.from("fixed_survey_questions").select("*")
        .eq("survey_id", s.id).order("order_index");
      return { survey: s as Survey, questions: (qs ?? []) as Question[] };
    },
  });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (surveyQ.data) {
      setTitle(surveyQ.data.survey?.title ?? "");
      setDesc(surveyQ.data.survey?.description ?? "");
      setQuestions(surveyQ.data.questions ?? []);
      setDirty(false);
    }
  }, [surveyQ.data]);

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      { id: crypto.randomUUID(), survey_id: "", label: "", order_index: qs.length, location_enabled: false },
    ]);
    setDirty(true);
  }
  function updateQ(id: string, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    setDirty(true);
  }
  function removeQ(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id).map((q, i) => ({ ...q, order_index: i })));
    setDirty(true);
  }

  async function save() {
    if (!title.trim()) { toast.error(t(lang, "タイトルを入力", "Enter a title")); return; }
    setSaving(true);
    try {
      let surveyId = surveyQ.data?.survey?.id;
      if (!surveyId) {
        const { data, error } = await supabase.from("fixed_surveys").insert({
          category_id: cat.id, title: title.trim(), description: desc.trim() || null, is_published: true,
        }).select("id").single();
        if (error) throw error;
        surveyId = data.id;
      } else {
        const { error } = await supabase.from("fixed_surveys")
          .update({ title: title.trim(), description: desc.trim() || null })
          .eq("id", surveyId);
        if (error) throw error;
      }
      // Replace-all questions strategy: delete existing, insert new (keeps ordering simple).
      const { error: delErr } = await supabase.from("fixed_survey_questions").delete().eq("survey_id", surveyId);
      if (delErr) throw delErr;
      if (questions.length > 0) {
        const { error: insErr } = await supabase.from("fixed_survey_questions").insert(
          questions.map((q, i) => ({
            survey_id: surveyId!,
            label: q.label.trim(),
            order_index: i,
            location_enabled: q.location_enabled,
          })).filter((q) => q.label),
        );
        if (insErr) throw insErr;
      }
      toast.success(t(lang, "保存しました", "Saved"));
      qc.invalidateQueries({ queryKey: ["admin-survey", cat.id] });
      qc.invalidateQueries({ queryKey: ["fixed-survey", cat.slug] });
      setDirty(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSurvey() {
    if (!surveyQ.data?.survey) return;
    if (!confirm(t(lang, "このアンケートを削除しますか？", "Delete this survey?"))) return;
    const { error } = await supabase.from("fixed_surveys").delete().eq("id", surveyQ.data.survey.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "削除しました", "Deleted"));
    qc.invalidateQueries({ queryKey: ["admin-survey", cat.id] });
  }

  if (surveyQ.isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> {t(lang, "戻る", "Back")}
      </button>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{cat.emoji}</span>
          <div className="font-bold">{lang === "ja" ? cat.name_ja : cat.name_en}</div>
        </div>
        <label className="text-[11px] text-muted-foreground">{t(lang, "タイトル", "Title")}</label>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          className="w-full min-h-[44px] px-3 rounded-xl border border-input bg-card mt-1" />
        <label className="text-[11px] text-muted-foreground mt-3 block">{t(lang, "説明（任意）", "Description (optional)")}</label>
        <textarea value={desc} onChange={(e) => { setDesc(e.target.value); setDirty(true); }} rows={3}
          className="w-full px-3 py-2 rounded-xl border border-input bg-card mt-1 text-sm resize-none" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm">{t(lang, "質問項目", "Questions")}</div>
          <button onClick={addQuestion}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
            <Plus className="w-3.5 h-3.5" /> {t(lang, "項目を追加", "Add question")}
          </button>
        </div>

        {questions.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">
            {t(lang, "質問がまだありません", "No questions yet")}
          </div>
        )}

        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border p-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                <input
                  value={q.label}
                  onChange={(e) => updateQ(q.id, { label: e.target.value })}
                  placeholder={t(lang, "質問文", "Question text")}
                  className="flex-1 min-h-[40px] px-2 rounded-lg border border-input bg-card text-sm"
                />
                <button onClick={() => removeQ(q.id)} className="p-2 rounded-lg text-muted-foreground hover:text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs pl-8">
                <input type="checkbox"
                  checked={q.location_enabled}
                  onChange={(e) => updateQ(q.id, { location_enabled: e.target.checked })}
                />
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {t(lang, "位置情報あり", "Location enabled")}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save} disabled={saving || !dirty}
          className="flex-1 min-h-[48px] rounded-xl bg-emerald-500 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? t(lang, "保存中...", "Saving...") : t(lang, "アンケートを保存", "Save survey")}
        </button>
        {surveyQ.data?.survey && (
          <button onClick={deleteSurvey}
            className="min-h-[48px] px-4 rounded-xl bg-rose-500 text-white font-semibold">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
