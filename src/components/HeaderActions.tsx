'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from './AuthModal';
import { Compass, LogIn, LogOut, Menu, X, User, UserPlus, Share2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// ── Social icon components (shared by desktop dropdown + mobile menu) ──

function DiscordIcon() {
  return (
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.222.4-.48.936-.658 1.362a18.27 18.27 0 0 0-5.454 0A12.51 12.51 0 0 0 9.115 3a19.736 19.736 0 0 0-4.435 1.372C1.998 8.347 1.223 12.069 1.61 15.72a19.9 19.9 0 0 0 5.993 3.03c.483-.66.914-1.362 1.285-2.098-.703-.264-1.375-.586-2.026-.952.17-.124.337-.253.497-.386a14.22 14.22 0 0 0 4.06 1.98 14.03 14.03 0 0 0 3.689.526 19.318 19.318 0 0 0 3.718-.451 14.085 14.085 0 0 0 2.684-1.001 14.14 14.14 0 0 0 2.398-1.606c.17.148.336.274.497.386-.656.367-1.328.69-2.03.954.371.736.802 1.438 1.285 2.098a19.845 19.845 0 0 0 6.001-3.03c.457-4.31-.628-8.045-2.785-11.352zM8.02 13.534c-1.171 0-2.13-1.078-2.13-2.402 0-1.325.94-2.403 2.13-2.403 1.192 0 2.15 1.078 2.13 2.403 0 1.324-.938 2.402-2.13 2.402zm7.96 0c-1.172 0-2.13-1.078-2.13-2.402 0-1.325.94-2.403 2.13-2.403 1.191 0 2.15 1.078 2.129 2.403 0 1.324-.938 2.402-2.129 2.402z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.04 15.31l-.38 5.32c.54 0 .78-.23 1.06-.51l2.55-2.44 5.28 3.87c.97.53 1.66.25 1.92-.9L23.9 4.6c.31-1.42-.51-1.98-1.45-1.63L1.7 9.7c-1.39.54-1.37 1.32-.24 1.67l5.31 1.66L19.33 6.5c.55-.36 1.05-.16.64.2z" />
    </svg>
  );
}

// ── Social registry — single source of truth for desktop + mobile ──
// NOTE: Discord href fixed — was doubled ("https://discord.gg/https://discord.gg/...")
const SOCIALS = [
  { name: "Discord", handle: "Join the community", href: "https://discord.gg/xXQYPUNum", icon: <DiscordIcon /> },
  { name: "GitHub", handle: "agenticweeb", href: "https://github.com/agenticweeb/myaniwatchorder", icon: <GitHubIcon /> },
  { name: "X / Twitter", handle: "@agenticweeb", href: "https://x.com/agenticweeb", icon: <XIcon /> },
  { name: "Telegram", handle: "Updates & announcements", href: "https://t.me/myanimewatchorder", icon: <TelegramIcon /> },
];

export function HeaderActions() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const socialsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Close the socials dropdown on outside-mousedown or Escape — the same
  // bulletproof pattern as AuthModal (mousedown, not click: no text-selection
  // drag false-positives).
  useEffect(() => {
    if (!socialsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (socialsRef.current && !socialsRef.current.contains(e.target as Node)) {
        setSocialsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSocialsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [socialsOpen]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile } = await supabase
            .from('user_progress')
            .select('progress_data')
            .eq('id', session.user.id)
            .single();

          const hasCloudData = profile && Object.keys(profile.progress_data || {}).length > 0;

          if (!hasCloudData) {
            const localData = localStorage.getItem('myaniwatchorder-progress-v2');
            if (localData) {
              const parsed = JSON.parse(localData);
              const progressMap = parsed?.state?.progressMap;

              if (progressMap && Object.keys(progressMap).length > 0) {
                await supabase
                  .from('user_progress')
                  .update({
                    progress_data: progressMap,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', session.user.id);
                console.log('✅ Migrated local progress to Supabase');
              }
            }
          }
        } catch (e) {
          console.error('Migration error:', e);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (searchParams.get('signin') === '1') {
      setIsAuthOpen(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-4">
        {/* Socials dropdown */}
        <div className="relative" ref={socialsRef}>
          <button
            type="button"
            onClick={() => setSocialsOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={socialsOpen}
            className="flex items-center gap-2 text-xs font-semibold text-[#a8a3b8] hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Socials</span>
          </button>
          {socialsOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 mt-2 w-56 bg-chrono-surface/95 backdrop-blur-xl border border-chrono-border/30 rounded-2xl shadow-2xl p-1.5 z-50"
            >
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSocialsOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <span className="text-[#a8a3b8] group-hover:text-white transition-colors shrink-0">{s.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-white">{s.name}</span>
                    <span className="block text-[10px] text-chrono-text-dim truncate">{s.handle}</span>
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/?tab=discover"
          className="flex items-center gap-2 text-xs font-semibold text-chrono-primary hover:text-white transition-colors bg-chrono-primary/10 px-3 py-1.5 rounded-full border border-chrono-primary/20"
        >
          <Compass className="w-4 h-4" />
          Discover
        </Link>
        <Link
          href="/about"
          className="flex items-center gap-2 text-xs font-semibold text-[#a8a3b8] hover:text-white transition-colors"
        >
          About
        </Link>
        {user ? (
          <>
            <Link
              href="/account"
              className="flex items-center gap-2 text-xs font-semibold text-[#a8a3b8] hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </Link>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 text-xs font-semibold text-[#a8a3b8] hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold text-white bg-gradient-to-r from-chrono-primary to-fuchsia-600 px-4 py-1.5 rounded-full hover:from-chrono-primary/90 hover:to-fuchsia-600/90 transition-all shadow-lg shadow-chrono-primary/25"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Up Free</span>
          </button>
        )}
      </div>

      {/* Mobile Layout — ChronoCompanion removed (was covering the hamburger) */}
      <div className="md:hidden flex items-center gap-2">
        {user ? (
          <Link
            href="/account"
            className="p-2 rounded-full bg-chrono-surface/50 text-[#a8a3b8] hover:text-white transition-colors"
            aria-label="Account"
          >
            <User className="w-4 h-4" />
          </Link>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-chrono-primary to-fuchsia-600 px-3.5 py-2 rounded-full transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up</span>
          </button>
        )}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-full bg-chrono-surface/50 text-[#a8a3b8] hover:text-white transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu — socials flat, no nested dropdowns on mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full right-0 mt-2 w-56 bg-chrono-surface/95 backdrop-blur-xl border border-chrono-border/30 rounded-2xl shadow-2xl p-2 space-y-1 z-50">
          <Link
            href="/?tab=discover"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-chrono-primary hover:bg-chrono-primary/10 transition-colors"
          >
            <Compass className="w-4 h-4" />
            Discover
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#a8a3b8] hover:bg-chrono-surface-hover transition-colors"
          >
            About
          </Link>
          {user && (
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#a8a3b8] hover:bg-chrono-surface-hover transition-colors"
            >
              <User className="w-4 h-4" />
              Account
            </Link>
          )}

          {/* Socials — flat, one tap each */}
          <div className="pt-2 mt-1 border-t border-chrono-border/20">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-chrono-text-dim">Socials</p>
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#a8a3b8] hover:bg-chrono-surface-hover hover:text-white transition-colors"
              >
                {s.icon}
                {s.name}
              </a>
            ))}
          </div>

          {user && (
            <>
              <div className="pt-2 mt-1 border-t border-chrono-border/20" />
              <button
                onClick={() => {
                  supabase.auth.signOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#a8a3b8] hover:bg-chrono-surface-hover transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          )}
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
