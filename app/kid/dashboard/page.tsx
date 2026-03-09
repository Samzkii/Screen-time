"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ChoreOrActivity {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  base_screen_time_minutes: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  level: number;
  multiplier: number;
  total_screen_time_earned: number;
  total_screen_time_used: number;
  screenTimeBalance: number;
}

export default function KidDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [chores, setChores] = useState<ChoreOrActivity[]>([]);
  const [activities, setActivities] = useState<ChoreOrActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileRes = await fetch("/api/user/profile");
        if (!profileRes.ok) {
          router.push("/login");
          return;
        }

        const profileData = await profileRes.json();
        if (profileData.role !== "child") {
          router.push("/parent/dashboard");
          return;
        }

        setUser(profileData);

        const [choresRes, activitiesRes] = await Promise.all([
          fetch("/api/chores"),
          fetch("/api/activities"),
        ]);

        if (choresRes.ok) {
          const choresData = await choresRes.json();
          setChores(choresData);
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleComplete = async (
    choreId: number,
    type: "chore" | "activity"
  ) => {
    setCompleting(choreId);
    try {
      const endpoint =
        type === "chore"
          ? `/api/chores/${choreId}/complete`
          : `/api/activities/${choreId}/complete`;

      const res = await fetch(endpoint, { method: "POST" });

      if (res.ok) {
        const data = await res.json();

        // Update local state
        if (type === "chore") {
          setChores((prev) =>
            prev.map((c) => (c.id === choreId ? data.chore : c))
          );
        } else {
          setActivities((prev) =>
            prev.map((a) => (a.id === choreId ? data.activity : a))
          );
        }

        // Refresh user profile to get updated screen time
        const profileRes = await fetch("/api/user/profile");
        if (profileRes.ok) {
          setUser(await profileRes.json());
        }
      }
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setCompleting(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-100">
        <p className="text-lg opacity-80">Loading your quest…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4 shadow-lg shadow-slate-950/70 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Kid view
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-50 md:text-3xl">
              <span className="text-xl">🎮</span>
              <span>{user?.name}&apos;s Screen Time Quest</span>
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400">
              Complete quests, level up, and turn real-world effort into screen
              time you can see and track.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 shadow-sm shadow-red-500/20 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <span>Log out</span>
          </button>
        </header>

        {/* Top stats */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center shadow-md shadow-slate-950/70">
            <p className="text-xs text-slate-400">Level</p>
            <p className="mt-1 text-3xl font-semibold text-sky-300">
              {user?.level}
            </p>
            <p className="mt-1 text-[0.7rem] text-slate-500">
              The higher your level, the more you earn.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center shadow-md shadow-slate-950/70">
            <p className="text-xs text-slate-400">Multiplier</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-300">
              {user?.multiplier}x
            </p>
            <p className="mt-1 text-[0.7rem] text-slate-500">
              Every completed quest multiplies your base reward.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center shadow-md shadow-slate-950/70">
            <p className="text-xs text-slate-400">Total earned</p>
            <p className="mt-1 text-2xl font-semibold text-sky-200">
              {user?.total_screen_time_earned} min
            </p>
            <p className="mt-1 text-[0.7rem] text-slate-500">
              All minutes you&apos;ve earned so far.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/70 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-slate-950 p-5 text-center shadow-md shadow-amber-500/25">
            <p className="text-xs text-amber-100/80">Available balance</p>
            <p className="mt-1 text-3xl font-semibold text-amber-300">
              {user?.screenTimeBalance} min
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-900/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200"
                style={{
                  width:
                    user && user.total_screen_time_earned > 0
                      ? `${Math.min(
                          100,
                          Math.round(
                            (user.screenTimeBalance /
                              user.total_screen_time_earned) *
                              100
                          )
                        )}%`
                      : "0%",
                }}
              />
            </div>
            <p className="mt-1 text-[0.7rem] text-amber-100/80">
              Spend these minutes with a parent&apos;s approval.
            </p>
          </div>
        </section>

        {/* Main content layout */}
        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
          {/* Chores Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  ⭐ Chores
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Real-world tasks that boost your level and minutes.
                </p>
              </div>
              {chores.length > 0 && (
                <p className="rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-400">
                  {chores.filter((c) => !c.completed).length} open quests
                </p>
              )}
            </div>

            {chores.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center">
                <p className="text-sm text-slate-200">No chores assigned yet.</p>
                <p className="mt-2 text-xs text-slate-400">
                  Ask your parent to add some quests so you can start earning
                  screen time.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {chores.map((chore) => (
                  <article
                    key={chore.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 shadow-md transition ${
                      chore.completed
                        ? "border-emerald-600/30 bg-emerald-950/40 opacity-75"
                        : "border-slate-800 bg-slate-950/80 hover:border-sky-500/70 hover:shadow-sky-900/40"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-y-0 right-[-40%] w-2/3 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.3)_0,_transparent_60%)] opacity-0 transition group-hover:opacity-100" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-50">
                            {chore.completed ? "✅ " : ""}
                            {chore.title}
                          </h3>
                          {!chore.completed && (
                            <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[0.7rem] font-medium text-sky-200">
                              +{chore.base_screen_time_minutes} min
                            </span>
                          )}
                        </div>
                        {chore.description && (
                          <p className="text-xs text-slate-400">
                            {chore.description}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400">
                          <span>⏱ {chore.duration_minutes} min to complete</span>
                          <span>🎬 {chore.base_screen_time_minutes} min base</span>
                        </div>
                        {chore.completed && chore.completed_at && (
                          <p className="text-[0.7rem] text-emerald-200/80">
                            Completed on{" "}
                            {new Date(chore.completed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleComplete(chore.id, "chore")}
                        disabled={chore.completed || completing === chore.id}
                        className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950 shadow transition ${
                          chore.completed
                            ? "cursor-default bg-emerald-500/40 text-emerald-950"
                            : "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/40 disabled:cursor-not-allowed"
                        }`}
                      >
                        {completing === chore.id
                          ? "Completing..."
                          : chore.completed
                            ? "Done"
                            : "Mark done"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Activities + info */}
          <section className="space-y-4">
            {/* Activities Section */}
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  🎯 Activities
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Fun or creative tasks that also earn you minutes.
                </p>
              </div>

              {activities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-center">
                  <p className="text-sm text-slate-200">
                    No activities assigned yet.
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    These might be reading, drawing, sports, or other good
                    habits your parents set for you.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activities.map((activity) => (
                    <article
                      key={activity.id}
                      className={`relative overflow-hidden rounded-2xl border p-4 shadow-md transition ${
                        activity.completed
                          ? "border-indigo-500/40 bg-indigo-950/40 opacity-80"
                          : "border-slate-800 bg-slate-950/80 hover:border-indigo-400/70 hover:shadow-indigo-900/40"
                      }`}
                    >
                      <div className="relative flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-50">
                              {activity.completed ? "✅ " : ""}
                              {activity.title}
                            </h3>
                            {!activity.completed && (
                              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-indigo-200">
                                +{activity.base_screen_time_minutes} min
                              </span>
                            )}
                          </div>
                          {activity.description && (
                            <p className="text-xs text-slate-400">
                              {activity.description}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-slate-400">
                            <span>⏱ {activity.duration_minutes} min</span>
                            <span>
                              🎬 {activity.base_screen_time_minutes} min base
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleComplete(activity.id, "activity")}
                          disabled={activity.completed || completing === activity.id}
                          className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold text-slate-950 shadow transition ${
                            activity.completed
                              ? "cursor-default bg-indigo-400/50 text-indigo-950"
                              : "bg-indigo-400 hover:bg-indigo-300 shadow-indigo-500/40 disabled:cursor-not-allowed"
                          }`}
                        >
                          {completing === activity.id
                            ? "Completing..."
                            : activity.completed
                              ? "Done"
                              : "Mark done"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center shadow-md shadow-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-50">
                💡 Screen time multiplier
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                Every time you finish a quest, you earn screen time based on your
                level. Right now your multiplier is{" "}
                <span className="font-semibold text-sky-200">
                  {user?.multiplier}x
                </span>
                .
              </p>
              <p className="mt-2 text-xs text-slate-300">
                That means a typical 15-minute task with a{" "}
                <span className="font-semibold">20 minute base reward</span> will
                actually earn you{" "}
                <span className="font-semibold text-emerald-200">
                  {Math.floor(20 * (user?.multiplier || 1))} minutes
                </span>{" "}
                of screen time at your current level.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
