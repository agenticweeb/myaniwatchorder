"use client";

import { Clock, Eye, Heart, Star, Zap, CalendarDays, Hash, Route } from "lucide-react";
import {
  UserPreferences,
  TimeBudget,
  Mood,
  SkipPreference,
  PathType,
  CustomSchedule,
} from "@/types";
import { cn } from "@/lib/utils";

interface PreferencePanelProps {
  preferences: UserPreferences;
  onChange: (prefs: UserPreferences) => void;
}

const PACE_OPTIONS: {
  value: TimeBudget;
  label: string;
  desc: string;
}[] = [
  { value: "casual", label: "Casual", desc: "30 min/day" },
  { value: "regular", label: "Regular", desc: "1 hour/day" },
  { value: "dedicated", label: "Dedicated", desc: "2 hours/day" },
  { value: "binge", label: "Binge", desc: "4 hours/day" },
];

const EPISODES_OPTIONS = [1, 2, 3, 4, 6, 8];

const SKIP_OPTIONS: {
  value: SkipPreference;
  label: string;
  description: string;
}[] = [
  {
    value: "smart-skip",
    label: "Smart Skip",
    description: "Keep story, skip pure filler & recaps. Side stories stay optional.",
  },
  {
    value: "watch-everything",
    label: "Watch Everything",
    description: "Include everything — even recaps. Completionist mode.",
  },
  {
    value: "canon-only",
    label: "Canon Only",
    description: "Only story that matters to the main plot.",
  },
];

const PATH_OPTIONS: {
  value: PathType;
  label: string;
  description: string;
}[] = [
  {
    value: "optimal",
    label: "Optimal",
    description: "Release order that preserves reveals (best for first-timers).",
  },
  {
    value: "release",
    label: "Release Order",
    description: "Exactly as it aired — no reordering.",
  },
  {
    value: "chronological",
    label: "Chronological",
    description: "In-universe timeline. May spoil later reveals.",
  },
];

const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "action", label: "Action" },
  { value: "feels", label: "Feels" },
  { value: "mindfuck", label: "Mindfuck" },
  { value: "comedy", label: "Comedy" },
  { value: "horror", label: "Horror" },
  { value: "mystery", label: "Mystery" },
  { value: "romance", label: "Romance" },
  { value: "adventure", label: "Adventure" },
];

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

const DEFAULT_CUSTOM_SCHEDULE: CustomSchedule = {
  enabled: false,
  monday: { enabled: true, startTime: "20:00", endTime: "22:00" },
  tuesday: { enabled: true, startTime: "20:00", endTime: "22:00" },
  wednesday: { enabled: true, startTime: "20:00", endTime: "22:00" },
  thursday: { enabled: true, startTime: "20:00", endTime: "22:00" },
  friday: { enabled: true, startTime: "20:00", endTime: "22:00" },
  saturday: { enabled: true, startTime: "10:00", endTime: "16:00" },
  sunday: { enabled: true, startTime: "10:00", endTime: "16:00" },
};

export function PreferencePanel({
  preferences,
  onChange,
}: PreferencePanelProps) {
  const activePaceType = preferences.paceType || "duration";
  const activeEpsPerDay = preferences.episodesPerDay || 2;
  const activePace = activePaceType === "episodes"
    ? `${activeEpsPerDay} ${activeEpsPerDay === 1 ? "episode" : "episodes"}/day`
    : PACE_OPTIONS.find((option) => option.value === preferences.timeBudget)?.desc || "1 hour/day";
  const activeSkip = SKIP_OPTIONS.find((option) => option.value === preferences.skipPreference)?.label || "Smart Skip";
  const activePath = PATH_OPTIONS.find((option) => option.value === preferences.preferredPath)?.label || "Optimal";
  const activeMood = (preferences.mood || ["all"]).includes("all")
    ? "Any mood"
    : (preferences.mood || []).map((mood) => MOOD_OPTIONS.find((option) => option.value === mood)?.label).filter(Boolean).join(" · ");

  const toggleMood = (mood: Mood) => {
    if (mood === "all") {
      onChange({ ...preferences, mood: ["all"] });
      return;
    }
    const current = preferences.mood || ["all"];
    const withoutAll = current.filter((m) => m !== "all");
    if (withoutAll.includes(mood)) {
      const filtered = withoutAll.filter((m) => m !== mood);
      onChange({
        ...preferences,
        mood: filtered.length === 0 ? ["all"] : filtered,
      });
    } else {
      onChange({ ...preferences, mood: [...withoutAll, mood] });
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 space-y-6 border border-chrono-border/40 bg-chrono-surface/40">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chrono-primary/15 text-chrono-primary">
          <Route className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-chrono-primary">Build your route</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-white">How do you want to watch?</h2>
          <p className="mt-1 text-xs leading-relaxed text-chrono-text-dim">
            Tune the route, skips, and pace. The anime entries themselves stay grounded in the franchise data.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-chrono-primary/25 bg-chrono-primary/[0.07] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-chrono-primary">Your route at a glance</p>
            <p className="mt-1 text-xs text-chrono-text-dim">You can change any of these before generating.</p>
          </div>
          <span className="hidden rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-chrono-text-dim sm:inline-flex">Live preview</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[activePath, activeSkip, activePace, activeMood].map((label) => (
            <span key={label} className="rounded-full border border-chrono-border/35 bg-black/15 px-2.5 py-1.5 text-[11px] font-bold text-white">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* NEW PACE TYPE TOGGLER: Duration vs Episodes per day */}
      <div className={cn("space-y-4", preferences.customSchedule?.enabled && "opacity-40 pointer-events-none")}>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-chrono-text-muted">
            <Clock className="w-4 h-4 text-chrono-primary" />
            Watch pace
            <span className="text-[10px] font-normal text-chrono-text-dim ml-1">
              · choose time or episodes
            </span>
          </label>
          <div className="flex rounded-xl bg-chrono-surface border border-chrono-border p-1">
            <button
              type="button"
              onClick={() => onChange({ ...preferences, paceType: "duration" })}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer", activePaceType === "duration" ? "bg-chrono-primary text-white" : "text-chrono-text-dim hover:text-white")}
            >
              Time Budget
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...preferences, paceType: "episodes" })}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer", activePaceType === "episodes" ? "bg-chrono-primary text-white" : "text-chrono-text-dim hover:text-white")}
            >
              Episodes / Day
            </button>
          </div>
        </div>

        {activePaceType === "duration" ? (
          /* Time Budget Grid selector */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in">
            {PACE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({ ...preferences, timeBudget: opt.value })
                }
                className={cn(
                  "flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all border cursor-pointer",
                  preferences.timeBudget === opt.value
                    ? "bg-chrono-primary text-white border-chrono-primary shadow-lg shadow-chrono-primary/20"
                    : "bg-chrono-surface text-chrono-text-muted border-chrono-border hover:border-chrono-primary/40 hover:text-chrono-text"
                )}
              >
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  {opt.value === "binge" ? <Zap className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 opacity-70" />}
                  {opt.label}
                </span>
                <span className={cn("text-[11px]", preferences.timeBudget === opt.value ? "text-white/70" : "text-chrono-text-dim")}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        ) : (
          /* Episodes Per Day Selector Scale */
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in">
            {EPISODES_OPTIONS.map((eps) => (
              <button
                key={eps}
                type="button"
                onClick={() => onChange({ ...preferences, episodesPerDay: eps })}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl transition-all border cursor-pointer",
                  activeEpsPerDay === eps
                    ? "bg-chrono-primary text-white border-chrono-primary shadow-lg shadow-chrono-primary/20"
                    : "bg-chrono-surface text-chrono-text-muted border-chrono-border hover:border-chrono-primary/40 hover:text-chrono-text"
                )}
              >
                <span className="text-sm font-bold flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  {eps}
                </span>
                <span className="text-[10px] text-chrono-text-dim font-medium mt-0.5">
                  {eps === 1 ? "ep / day" : "eps / day"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Schedule Builder */}
      <div className="border-t border-chrono-border/20 pt-5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-chrono-text-muted">
            <CalendarDays className="w-4 h-4 text-chrono-primary" />
            Custom weekly schedule
            <span className="text-[10px] font-normal text-chrono-text-dim ml-1">
              · overrides watch pace when enabled
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              const currentSched = preferences.customSchedule || DEFAULT_CUSTOM_SCHEDULE;
              onChange({
                ...preferences,
                customSchedule: {
                  ...currentSched,
                  enabled: !currentSched.enabled,
                },
              });
            }}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
              preferences.customSchedule?.enabled
                ? "bg-chrono-primary/20 border-chrono-primary text-chrono-primary"
                : "bg-chrono-surface border-chrono-border text-chrono-text-muted"
            )}
          >
            {preferences.customSchedule?.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        {preferences.customSchedule?.enabled && (
          <div className="mt-4 p-4 rounded-xl border border-chrono-border/30 bg-chrono-surface/30 space-y-3.5 animate-slide-up">
            <p className="text-[11px] text-chrono-text-dim leading-relaxed">
              Configure exactly which days of the week you can watch anime, and during what specific hours. MyAniWatchOrder will dynamically calculate your completion timeline.
            </p>

            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const sched = preferences.customSchedule || DEFAULT_CUSTOM_SCHEDULE;
                const daySched = sched[day.key] || { enabled: true, startTime: "20:00", endTime: "22:00" };

                return (
                  <div
                    key={day.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-black/25 border border-chrono-border/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={daySched.enabled}
                        onChange={(e) => {
                          const updated = {
                            ...sched,
                            [day.key]: {
                              ...daySched,
                              enabled: e.target.checked,
                            },
                          };
                          onChange({ ...preferences, customSchedule: updated });
                        }}
                        className="rounded border-chrono-border bg-chrono-surface text-chrono-primary focus:ring-chrono-primary w-4 h-4 cursor-pointer"
                      />
                      <span className={cn("text-xs font-semibold", daySched.enabled ? "text-chrono-text" : "text-chrono-text-dim")}>
                        {day.label}
                      </span>
                    </div>

                    {daySched.enabled && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-chrono-text-dim text-[11px]">Watch from</span>
                        <input
                          type="time"
                          value={daySched.startTime}
                          onChange={(e) => {
                            const updated = {
                              ...sched,
                              [day.key]: {
                                ...daySched,
                                startTime: e.target.value,
                              },
                            };
                            onChange({ ...preferences, customSchedule: updated });
                          }}
                          className="bg-chrono-surface border border-chrono-border/50 text-chrono-text rounded px-2 py-1 focus:ring-1 focus:ring-chrono-primary font-medium"
                        />
                        <span className="text-chrono-text-dim text-[11px]">to</span>
                        <input
                          type="time"
                          value={daySched.endTime}
                          onChange={(e) => {
                            const updated = {
                              ...sched,
                              [day.key]: {
                                ...daySched,
                                endTime: e.target.value,
                              },
                            };
                            onChange({ ...preferences, customSchedule: updated });
                          }}
                          className="bg-chrono-surface border border-chrono-border/50 text-chrono-text rounded px-2 py-1 focus:ring-1 focus:ring-chrono-primary font-medium"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Skip strategy */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-chrono-text-muted mb-2">
          <Eye className="w-4 h-4 text-chrono-primary" />
          Skip strategy
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SKIP_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() =>
                onChange({ ...preferences, skipPreference: opt.value })
              }
              className={cn(
                "p-3 rounded-xl text-left transition-all border cursor-pointer",
                preferences.skipPreference === opt.value
                  ? "bg-chrono-primary/15 border-chrono-primary/50 text-chrono-text ring-1 ring-chrono-primary/30"
                  : "bg-chrono-surface border-chrono-border text-chrono-text-muted hover:border-chrono-text-dim"
              )}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-[11px] mt-1 leading-snug opacity-80">
                {opt.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Path preference */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-chrono-text-muted mb-2">
          <Star className="w-4 h-4 text-chrono-primary" />
          Viewing path
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PATH_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() =>
                onChange({ ...preferences, preferredPath: opt.value })
              }
              className={cn(
                "p-3 rounded-xl text-left transition-all border cursor-pointer",
                preferences.preferredPath === opt.value
                  ? "bg-chrono-primary/15 border-chrono-primary/50 text-chrono-text ring-1 ring-chrono-primary/30"
                  : "bg-chrono-surface border-chrono-border text-chrono-text-muted hover:border-chrono-text-dim"
              )}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-[11px] mt-1 leading-snug opacity-80">
                {opt.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-chrono-text-muted mb-2">
          <Heart className="w-4 h-4 text-chrono-accent" />
          Mood preference
          <span className="text-[10px] font-normal text-chrono-text-dim">
            · optional · influences path pick, not titles
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleMood(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer",
                preferences.mood?.includes(opt.value)
                  ? "bg-chrono-accent/15 text-chrono-accent border-chrono-accent/40"
                  : "bg-chrono-surface text-chrono-text-muted border-chrono-border hover:border-chrono-text-dim"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
