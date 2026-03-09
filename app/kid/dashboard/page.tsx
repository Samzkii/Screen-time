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
        if (profileData.role !== "kid") {
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-indigo-600">
            🎮 {user?.name}'s Screen Time Quest
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            Log Out
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 text-sm mb-1">Level</p>
            <p className="text-4xl font-bold text-indigo-600">{user?.level}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 text-sm mb-1">Multiplier</p>
            <p className="text-4xl font-bold text-green-600">{user?.multiplier}x</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 text-sm mb-1">Screen Time Earned</p>
            <p className="text-2xl font-bold text-blue-600">
              {user?.total_screen_time_earned} min
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center border-4 border-yellow-300">
            <p className="text-gray-600 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold text-yellow-600">
              {user?.screenTimeBalance} min
            </p>
          </div>
        </div>

        {/* Chores Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">⭐ Available Chores</h2>
          {chores.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No chores assigned yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {chores.map((chore) => (
                <div
                  key={chore.id}
                  className={`bg-white rounded-lg shadow p-6 ${
                    chore.completed ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">
                        {chore.completed ? "✅ " : ""}
                        {chore.title}
                      </h3>
                      {chore.description && (
                        <p className="text-gray-600 mt-2">{chore.description}</p>
                      )}
                      <div className="flex gap-4 mt-3 text-sm text-gray-600">
                        <span>⏱️ {chore.duration_minutes} min</span>
                        <span>🎬 {chore.base_screen_time_minutes} min base</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleComplete(chore.id, "chore")}
                      disabled={chore.completed || completing === chore.id}
                      className={`ml-4 ${
                        chore.completed
                          ? "bg-gray-400"
                          : "bg-green-500 hover:bg-green-600"
                      } text-white font-bold py-2 px-6 rounded-lg transition whitespace-nowrap`}
                    >
                      {completing === chore.id
                        ? "Completing..."
                        : chore.completed
                          ? "Done"
                          : "Complete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Activities</h2>
          {activities.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No activities assigned yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`bg-white rounded-lg shadow p-6 ${
                    activity.completed ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">
                        {activity.completed ? "✅ " : ""}
                        {activity.title}
                      </h3>
                      {activity.description && (
                        <p className="text-gray-600 mt-2">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-3 text-sm text-gray-600">
                        <span>⏱️ {activity.duration_minutes} min</span>
                        <span>🎬 {activity.base_screen_time_minutes} min base</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleComplete(activity.id, "activity")}
                      disabled={activity.completed || completing === activity.id}
                      className={`ml-4 ${
                        activity.completed
                          ? "bg-gray-400"
                          : "bg-green-500 hover:bg-green-600"
                      } text-white font-bold py-2 px-6 rounded-lg transition whitespace-nowrap`}
                    >
                      {completing === activity.id
                        ? "Completing..."
                        : activity.completed
                          ? "Done"
                          : "Complete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            💡 Screen Time Multiplier
          </h3>
          <p className="text-blue-800">
            Each time you complete a chore or activity, you earn screen time
            based on your level. Your current multiplier is <strong>{user?.multiplier}x</strong>, so
            you earn <strong>{Math.floor((20 * (user?.multiplier || 1)))} minutes</strong> per 15-minute task!
          </p>
        </div>
      </div>
    </div>
  );
}
