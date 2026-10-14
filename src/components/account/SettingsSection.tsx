"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, Settings, Trash2 } from "lucide-react";

interface SettingsData { email_notifications: boolean }
const DEFAULT_SETTINGS: SettingsData = { email_notifications: true };

export function SettingsSection({ initialSettings }: { initialSettings: SettingsData | null }) {
  const [settings, setSettings] = useState<SettingsData>({ ...DEFAULT_SETTINGS, ...(initialSettings || {}) });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const persist = async (next: SettingsData) => {
    const previous = settings;
    setSettings(next); setSaving(true); setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("user_progress").update({ settings: next }).eq("id", user.id);
      if (error) throw error;
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { setSettings(previous); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleteStage("deleting"); setDeleteError(null);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Deletion failed");
      window.location.href = "/?account_deleted=1";
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Deletion failed"); setDeleteStage("error");
    }
  };

  return <section className="glass-card rounded-2xl border border-chrono-border/30 p-5 sm:p-6">
    <div className="flex items-center justify-between gap-4"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white"><Settings className="h-4 w-4 text-chrono-primary" /> Preferences</h2>{saving && <Loader2 className="h-4 w-4 animate-spin text-chrono-primary" />}{saved && !saving && <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400"><Check className="h-3.5 w-3.5" /> Saved</span>}</div>
    <div className="mt-5 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-white">Account emails</p><p className="mt-1 text-[11px] leading-relaxed text-chrono-text-dim">Keep transactional account emails enabled. Future product updates will respect this preference.</p></div><button type="button" role="switch" aria-checked={settings.email_notifications} onClick={() => persist({ ...settings, email_notifications: !settings.email_notifications })} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settings.email_notifications ? "bg-chrono-primary" : "bg-zinc-700"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${settings.email_notifications ? "left-[22px]" : "left-0.5"}`} /></button></div>
    <div className="mt-6 border-t border-chrono-border/20 pt-5">{deleteStage !== "confirm" && deleteStage !== "deleting" ? <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-rose-300">Delete account</p><p className="mt-1 text-[11px] text-chrono-text-dim">Permanently removes your account, synced progress, and history.</p>{deleteStage === "error" && <p className="mt-1 text-[11px] text-rose-400">{deleteError}</p>}</div><button type="button" onClick={() => setDeleteStage("confirm")} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-500/30 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div> : <div className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4"><p className="text-sm font-semibold text-white">Delete everything?</p><p className="text-[11px] text-chrono-text-muted">This cannot be undone and removes your account, synced watch progress, and generation history.</p><div className="flex gap-2"><button type="button" onClick={handleDelete} disabled={deleteStage === "deleting"} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{deleteStage === "deleting" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{deleteStage === "deleting" ? "Deleting…" : "Yes, delete everything"}</button><button type="button" onClick={() => setDeleteStage("idle")} disabled={deleteStage === "deleting"} className="rounded-xl px-4 py-2 text-xs font-bold text-chrono-text-dim hover:text-white">Cancel</button></div></div>}</div>
  </section>;
}
