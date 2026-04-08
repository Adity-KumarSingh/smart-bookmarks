"use client";

import { createClient } from "@/lib/supabase/client";
import { Bookmark, Globe, Shield, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Bookmark className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Smart Bookmarks
            </h1>
            <p className="mt-3 text-muted text-lg">
              Save, organize, and sync your bookmarks across all your tabs.
            </p>
          </div>

          <div className="space-y-4 mb-10">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  Real-Time Sync
                </p>
                <p className="text-muted text-sm">
                  Bookmarks update instantly across all open tabs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <Shield className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  Private & Secure
                </p>
                <p className="text-muted text-sm">
                  Your bookmarks are private, secured with Row Level Security.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <Globe className="w-4.5 h-4.5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  Smart Metadata
                </p>
                <p className="text-muted text-sm">
                  Auto-fetches titles, descriptions, and favicons from URLs.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
              Authentication failed. Please try again.
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-xl bg-white border border-stone-200 text-foreground font-medium text-sm shadow-sm hover:shadow-md hover:border-stone-300 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-stone-300 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="text-center text-xs text-muted mt-4">
            Sign in securely with your Google account. No password needed.
          </p>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-muted border-t border-card-border">
        Built with Next.js, Supabase & Tailwind CSS
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
