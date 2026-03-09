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
          } else {
            router.push("/kid/dashboard");
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
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-indigo-600">
            🎮 Screentime Rewards
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Earn screen time by completing chores and activities!
          </p>

          <div className="space-y-4">
            <Link
              href="/signup"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition text-center block"
            >
              Create Account
            </Link>

            <Link
              href="/login"
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition text-center block"
            >
              Log In
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="font-bold text-lg mb-4 text-gray-800">How it works:</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-3">✅</span>
                <span>Parents create chores and activities for kids</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">⭐</span>
                <span>Kids complete tasks to earn screen time minutes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">📈</span>
                <span>Higher levels earn more screen time (multiplier bonus)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3">🎯</span>
                <span>Level 1 = 1x, Level 2 = 1.5x, Level 3 = 2x, etc.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
