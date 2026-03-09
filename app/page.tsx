"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          setIsLoggedIn(true);
          const data = await res.json();
          if (data.role === "parent") {
            router.push("/parent/dashboard");
          } else if (data.role === "child") {
            router.push("/kid/dashboard");
          } else {
            router.push("/");
          }
        }
      } catch (error) {
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-100">
        <p className="text-lg opacity-80">Loading your family dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-10">
      <div className="w-full max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.25fr,1fr] items-stretch">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70 p-8 md:p-10 shadow-2xl shadow-sky-900/40">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.38)_0,_transparent_55%)]" />

            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Designed for modern families
              </div>

              <div>
                <h1 className="text-balance text-4xl md:text-5xl font-semibold tracking-tight text-slate-50">
                  Turn chores into
                  <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    {" "}
                    screen time rewards
                  </span>
                  .
                </h1>
                <p className="mt-4 max-w-xl text-sm md:text-base text-slate-300">
                  Kids complete real-world tasks to earn minutes. Parents stay in
                  control with clear limits, multipliers, and a shared family view.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-xs md:text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <dt className="mb-1 text-slate-400">For parents</dt>
                  <dd className="space-y-1.5">
                    <p className="font-medium text-slate-100">
                      Create chores & approve completions
                    </p>
                    <p className="text-slate-400">
                      Set fair rewards, track each child&apos;s balance, and keep
                      every minute accountable.
                    </p>
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <dt className="mb-1 text-slate-400">For kids</dt>
                  <dd className="space-y-1.5">
                    <p className="font-medium text-slate-100">
                      Level up with good habits
                    </p>
                    <p className="text-slate-400">
                      Complete quests, earn XP-style multipliers, and unlock more
                      screen time the right way.
                    </p>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                <div className="inline-flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-xs">
                    ✓
                  </span>
                  No ads. No dark patterns.
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center text-xs">
                    ⏱
                  </span>
                  Minutes are always visible to both sides.
                </div>
              </div>
            </div>
          </section>

          {/* Auth card */}
          <section className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-sky-500/30 via-indigo-500/20 to-transparent blur-2xl" />
            <div className="relative h-full rounded-3xl border border-slate-800 bg-slate-950/80 p-7 shadow-2xl shadow-slate-950/70 backdrop-blur">
              <h2 className="text-center text-2xl font-semibold text-slate-50">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  Screentime Rewards
                </span>
              </h2>
              <p className="mt-2 text-center text-sm text-slate-400">
                Start a new family space or jump back into your existing one.
              </p>

              <div className="mt-6 space-y-3">
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-slate-50 shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <span>Get started as a parent</span>
                  <span aria-hidden>→</span>
                </Link>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  <span>Log in to an existing account</span>
                </Link>
              </div>

              <div className="mt-8 border-t border-slate-800 pt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-200">
                  How it works
                </h3>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-base">✅</span>
                    <span>Parents create chores and activities for kids.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-base">⭐</span>
                    <span>Kids complete tasks to earn screen time minutes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-base">📈</span>
                    <span>
                      Higher levels increase rewards with a fair multiplier.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-base">🎯</span>
                    <span>
                      Level 1 = 1x, Level 2 = 1.5x, Level 3 = 2x, and so on.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
