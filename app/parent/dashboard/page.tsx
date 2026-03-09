"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Kid {
  id: number;
  name: string;
  email: string;
  level: number;
  total_screen_time_earned: number;
  total_screen_time_used: number;
}

interface UserProfile {
  id: number;
  name: string;
  role: string;
  family_id?: number;
}

export default function ParentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChoreForm, setShowChoreForm] = useState(false);
  const [selectedKidId, setSelectedKidId] = useState<number | null>(null);
  const [choreForm, setChoreForm] = useState({
    title: "",
    description: "",
    durationMinutes: 15,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileRes = await fetch("/api/user/profile");
        if (!profileRes.ok) {
          router.push("/login");
          return;
        }

        const profileData = await profileRes.json();
        if (profileData.role !== "parent") {
          router.push("/kid/dashboard");
          return;
        }

        setUser(profileData);

        const kidsRes = await fetch("/api/user/kids");
        if (kidsRes.ok) {
          const kidsData = await kidsRes.json();
          setKids(kidsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKidId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidId: selectedKidId,
          title: choreForm.title,
          description: choreForm.description,
          durationMinutes: choreForm.durationMinutes,
        }),
      });

      if (res.ok) {
        setChoreForm({ title: "", description: "", durationMinutes: 15 });
        setShowChoreForm(false);
        // Could reload chores here
      }
    } catch (error) {
      console.error("Error adding chore:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-100">
        <p className="text-lg opacity-80">Loading your family dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 px-5 py-4 shadow-lg shadow-slate-950/60 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Parent view
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-50 md:text-3xl">
              <span className="text-xl">👨‍👩‍👧‍👦</span>
              <span>{user?.name}&apos;s family dashboard</span>
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400">
              See each child&apos;s level, earned minutes, and balance at a
              glance. Create new tasks in one tap.
            </p>
            {user?.family_id && (
              <p className="mt-2 text-[0.7rem] text-slate-500">
                Family ID:{" "}
                <span className="font-mono text-slate-200">
                  {user.family_id}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 shadow-sm shadow-red-500/20 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <span>Log out</span>
          </button>
        </header>

        {/* Kids + Info Layout */}
        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr),minmax(0,0.9fr)]">
          {/* Kids List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Kids
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Overview of screen time progress for each child.
                </p>
              </div>
              {kids.length > 0 && (
                <p className="rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-400">
                  {kids.length} linked{" "}
                  {kids.length === 1 ? "account" : "accounts"}
                </p>
              )}
            </div>

            {kids.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
                <p className="text-sm text-slate-200">
                  You haven&apos;t linked any kids yet.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Have them sign up with the same family email, then approve
                  their account from your dashboard.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {kids.map((kid) => {
                  const earned = kid.total_screen_time_earned || 0;
                  const used = kid.total_screen_time_used || 0;
                  const remaining = Math.max(0, earned - used);
                  const usagePercent =
                    earned > 0 ? Math.min(100, Math.round((used / earned) * 100)) : 0;

                  return (
                    <article
                      key={kid.id}
                      className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 p-5 shadow-md shadow-slate-950/70 transition hover:border-sky-500/60 hover:shadow-sky-900/50"
                    >
                      <div className="pointer-events-none absolute inset-y-0 right-[-40%] w-2/3 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25)_0,_transparent_60%)] opacity-0 transition group-hover:opacity-100" />

                      <div className="relative grid gap-4 md:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)] md:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h3 className="text-lg font-semibold text-slate-50">
                              {kid.name}
                            </h3>
                            <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                              Level {kid.level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{kid.email}</p>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Screen time usage</span>
                              <span>
                                {used} / {earned} min used
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 transition-all"
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <p className="text-xs text-emerald-300">
                              {remaining} minutes still available
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                          <dl className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <dt className="text-slate-400">Earned</dt>
                              <dd className="mt-1 text-sm font-semibold text-emerald-300">
                                {earned} min
                              </dd>
                            </div>
                            <div>
                              <dt className="text-slate-400">Used</dt>
                              <dd className="mt-1 text-sm font-semibold text-rose-300">
                                {used} min
                              </dd>
                            </div>
                          </dl>

                          <button
                            onClick={() => {
                              setSelectedKidId(kid.id);
                              setShowChoreForm(true);
                            }}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-2.5 text-sm font-semibold text-slate-50 shadow shadow-sky-900/40 transition hover:from-sky-400 hover:to-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                          >
                            <span>+ Add task</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right column: chore form + info */}
          <section className="space-y-4">
            {/* Add Chore Form */}
            {showChoreForm && selectedKidId && (
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-md shadow-slate-950/70">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  New task
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Assign a new chore or activity with an appropriate reward.
                </p>

                <p className="mt-3 text-sm font-medium text-slate-100">
                  For{" "}
                  <span className="text-sky-300">
                    {kids.find((k) => k.id === selectedKidId)?.name}
                  </span>
                </p>

                <form onSubmit={handleAddChore} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Task title
                    </label>
                    <input
                      type="text"
                      value={choreForm.title}
                      onChange={(e) =>
                        setChoreForm({ ...choreForm, title: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                      required
                      placeholder="e.g. Clean your room"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Description (optional)
                    </label>
                    <textarea
                      value={choreForm.description}
                      onChange={(e) =>
                        setChoreForm({
                          ...choreForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                      rows={3}
                      placeholder="Add any helpful details or expectations."
                    ></textarea>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={choreForm.durationMinutes}
                      onChange={(e) =>
                        setChoreForm({
                          ...choreForm,
                          durationMinutes: parseInt(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                      required
                      min="1"
                    />
                  </div>

                  <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-100">
                    📺 Screen time calculation:{" "}
                    <span className="font-semibold text-sky-50">
                      {choreForm.durationMinutes} min
                    </span>{" "}
                    activity will earn{" "}
                    <span className="font-semibold text-sky-50">
                      {Math.floor((choreForm.durationMinutes / 15) * 20)} min
                    </span>{" "}
                    base screen time, multiplied by your child&apos;s level.
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-emerald-950 shadow shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
                    >
                      {submitting ? "Adding..." : "Add task"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChoreForm(false)}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Info Section */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-md shadow-slate-950/70">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                How multipliers work
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Kids are rewarded more as they build consistent, positive habits.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                    Level 1
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-100">
                    1.0x
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                    Level 2
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-100">
                    1.5x
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                    Level 3
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-100">
                    2.0x
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                    Level 4
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-100">
                    2.5x
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                    Level 5+
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-100">
                    Keeps growing…
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-300">
                Example: A 15-minute chore gives 20 minutes base. At Level 2
                (1.5×), they earn 30 minutes. At Level 3 (2×), the same chore
                earns 40 minutes — giving kids a reason to stay consistent.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
