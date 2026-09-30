"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

type Mode = "login" | "signup";
type Status = "idle" | "loading" | "error" | "success";
type OAuthProvider = "google" | "discord";

export function AuthModal({ isOpen, onClose, redirectTo = "/" }: AuthModalProps) {
  const emailFieldId = useId();
  const passwordFieldId = useId();
  // Default to SIGNUP — "Login" as the header button label was misleading
  // (new visitors thought they needed an existing account and skipped it)
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ref on the dialog card — the backdrop close uses contains(), so mousedown
  // anywhere INSIDE the modal (including text-selection drags that release
  // over the backdrop) can never close it.
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setEmail("");
    setPassword("");
    setStatus("idle");
    setErrorMsg(null);
    setOauthLoading(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const buildCallbackUrl = useCallback(() => {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", redirectTo);
    return url.toString();
  }, [redirectTo]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) return;

      setStatus("loading");
      setErrorMsg(null);

      const supabase = createClient();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: buildCallbackUrl() },
        });

        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
        } else {
          setStatus("success");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
        } else {
          onClose();
        }
      }
    },
    [email, password, mode, buildCallbackUrl, onClose]
  );

  const handleOAuth = useCallback(
    async (provider: OAuthProvider) => {
      setErrorMsg(null);
      setOauthLoading(provider);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: buildCallbackUrl() },
      });

      if (error) {
        setErrorMsg(error.message);
        setOauthLoading(null);
      }
    },
    [buildCallbackUrl]
  );

  if (!isOpen || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-sm"
      role="presentation"
      // onMouseDown + contains() instead of onClick: click fires on mouseUP,
      // so a text-selection drag that started inside the form and released
      // over the backdrop registered as an outside click and closed the modal.
      // mousedown either starts inside or it doesn't — no false positives.
      onMouseDown={(e) => {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4 py-10">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === "login" ? "Login" : "Sign Up"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {mode === "login"
                  ? "Welcome back. Sign in to sync your progress."
                  : "Free forever. Sync your watch progress across devices, get personalized recommendations, and never lose your timeline."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <CloseIcon />
            </button>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-2.5 mb-5">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={oauthLoading !== null || status === "loading"}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <GoogleIcon />
              <span>{oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth("discord")}
              disabled={oauthLoading !== null || status === "loading"}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#5865F2] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <DiscordIcon />
              <span>{oauthLoading === "discord" ? "Redirecting…" : "Continue with Discord"}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              or
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Success State (for signup with email confirmation) */}
          {status === "success" ? (
            <div className="space-y-1 py-2 text-center">
              <p className="text-sm font-semibold text-white">Check your inbox</p>
              <p className="text-xs text-zinc-400">
                We sent a confirmation link to <span className="text-zinc-300">{email}</span>.
                Click it to activate your account.
              </p>
              <button
                type="button"
                onClick={() => { setStatus("idle"); setMode("login"); }}
                className="mt-2 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                I have an account — Login
              </button>
            </div>
          ) : (
            /* Email/Password Form */
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor={emailFieldId} className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id={emailFieldId}
                  type="email"
                  inputMode="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={passwordFieldId} className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <input
                  id={passwordFieldId}
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "login" ? "Your password" : "At least 6 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading" || !email.trim() || !password || (mode === "signup" && !agreedToTerms)}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {status === "loading"
                  ? "Please wait…"
                  : mode === "login"
                    ? "Login"
                    : "Create Account"}
              </button>

              {mode === "signup" && (
                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-indigo-500"
                  />
                  <span className="text-[11px] text-zinc-400 leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              )}
            </form>
          )}

          {/* Error */}
          {errorMsg && (
            <p role="alert" className="mt-3 text-center text-xs text-rose-400">
              {errorMsg}
            </p>
          )}

          {/* Mode Toggle */}
          {status !== "success" && (
            <p className="mt-5 text-center text-xs text-zinc-400">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setErrorMsg(null); setStatus("idle"); }}
                    className="font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setErrorMsg(null); setStatus("idle"); }}
                    className="font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Login
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ── Icons ──────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.222.4-.48.936-.658 1.362a18.27 18.27 0 0 0-5.454 0A12.51 12.51 0 0 0 9.115 3a19.736 19.736 0 0 0-4.435 1.372C1.998 8.24 1.223 12.007 1.61 15.72a19.9 19.9 0 0 0 5.993 3.03c.483-.66.914-1.362 1.285-2.098a12.9 12.9 0 0 1-2.023-.98c.17-.124.336-.253.497-.386 3.9 1.804 8.128 1.804 11.982 0 .162.133.328.262.497.386-.646.386-1.324.71-2.026.981.372.735.802 1.437 1.286 2.098a19.845 19.845 0 0 0 6.001-3.03c.457-4.31-.628-8.045-2.785-11.352zM8.02 13.802c-1.171 0-2.13-1.078-2.13-2.402 0-1.325.938-2.403 2.13-2.403 1.192 0 2.15 1.078 2.13 2.403.002 1.324-.938 2.402-2.13 2.402zm7.96 0c-1.172 0-2.13-1.078-2.13-2.402 0-1.325.937-2.403 2.13-2.403 1.191 0 2.148 1.078 2.129 2.403 0 1.324-.938 2.402-2.129 2.402z" />
    </svg>
  );
}
