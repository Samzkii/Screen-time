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
            👨‍👩‍👧‍👦 {user?.name}'s Family Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            Log Out
          </button>
        </div>

        {/* Kids List */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">👨‍👧‍👦 Your Kids</h2>

        {kids.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center mb-8">
            <p className="text-gray-600 mb-4">
              You haven't added any kids yet. They need to sign up and link to
              your account.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 mb-8">
            {kids.map((kid) => (
              <div key={kid.id} className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {kid.name}
                    </h3>
                    <p className="text-gray-600 text-sm">{kid.email}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-600 text-sm">Level</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {kid.level}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-600 text-sm">Earned</p>
                    <p className="text-xl font-bold text-green-600">
                      {kid.total_screen_time_earned} min
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-600 text-sm">Used</p>
                    <p className="text-xl font-bold text-red-600">
                      {kid.total_screen_time_used} min
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedKidId(kid.id);
                      setShowChoreForm(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    + Add Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Chore Form */}
        {showChoreForm && selectedKidId && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {
                kids.find((k) => k.id === selectedKidId)?.name
              }'s New Task
            </h3>

            <form onSubmit={handleAddChore} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={choreForm.title}
                  onChange={(e) =>
                    setChoreForm({ ...choreForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  placeholder="e.g., Clean your room"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={choreForm.description}
                  onChange={(e) =>
                    setChoreForm({ ...choreForm, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Add any details here"
                ></textarea>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  min="1"
                />
              </div>

              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                📺 Screen time calculation: {choreForm.durationMinutes} min
                activity will earn{" "}
                <strong>
                  {Math.floor((choreForm.durationMinutes / 15) * 20)} min
                </strong>{" "}
                base screen time (multiplied by kid's level)
              </p>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {submitting ? "Adding..." : "Add Task"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChoreForm(false)}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            💡 How Multipliers Work
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm text-blue-800">
            <div>
              <p className="font-bold">L1</p>
              <p>1.0x</p>
            </div>
            <div>
              <p className="font-bold">L2</p>
              <p>1.5x</p>
            </div>
            <div>
              <p className="font-bold">L3</p>
              <p>2.0x</p>
            </div>
            <div>
              <p className="font-bold">L4</p>
              <p>2.5x</p>
            </div>
            <div>
              <p className="font-bold">L5+</p>
              <p>And more...</p>
            </div>
          </div>
          <p className="mt-3 text-sm">
            Example: A 15-minute chore gives 20 min base screen time. At Level
            2 (1.5x), they get 30 minutes!
          </p>
        </div>
      </div>
    </div>
  );
}
