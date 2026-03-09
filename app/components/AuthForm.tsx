"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AuthFormProps {
  isSignup?: boolean;
}

export default function AuthForm({ isSignup = false }: AuthFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"parent" | "child">("parent");
  const [familyId, setFamilyId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const payload = isSignup
        ? role === "child"
          ? { email, password, name, role, familyId: familyId.trim() }
          : { email, password, name, role }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }

      // Redirect based on role
      if (data.user.role === "parent") {
        router.push("/parent/dashboard");
      } else if (data.user.role === "child") {
        router.push("/kid/dashboard");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-sky-500/30 via-indigo-500/20 to-transparent blur-2xl" />
        <div className="relative rounded-3xl border border-slate-800 bg-slate-950/85 p-8 shadow-2xl shadow-slate-950/70 backdrop-blur">
          <h1 className="mb-2 text-center text-2xl font-semibold text-slate-50">
            {isSignup ? "Create your Screentime account" : "Log in to Screentime"}
          </h1>
          <p className="mb-6 text-center text-xs text-slate-400">
            {isSignup
              ? "Parents start a new family space. Kids can join with a Family ID."
              : "Use the email and password you signed up with."}
          </p>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {isSignup && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-200">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                  required
                  placeholder="e.g. Alex Johnson"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                required
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-200">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                required
                placeholder="••••••••"
              />
            </div>

            {isSignup && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">
                    Account type
                  </label>
                  <div className="grid gap-2 text-xs md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setRole("parent")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                        role === "parent"
                          ? "border-sky-400 bg-sky-500/15 text-sky-100"
                          : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <span>
                        <span className="block text-[0.7rem] font-semibold uppercase tracking-wide">
                          Parent
                        </span>
                        <span className="mt-0.5 block text-[0.7rem] text-slate-400">
                          Create and manage your family
                        </span>
                      </span>
                      <span
                        className={`ml-2 h-4 w-4 rounded-full border ${
                          role === "parent"
                            ? "border-sky-300 bg-sky-400"
                            : "border-slate-500"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("child")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                        role === "child"
                          ? "border-violet-400 bg-violet-500/15 text-violet-100"
                          : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <span>
                        <span className="block text-[0.7rem] font-semibold uppercase tracking-wide">
                          Kid
                        </span>
                        <span className="mt-0.5 block text-[0.7rem] text-slate-400">
                          Join an existing family
                        </span>
                      </span>
                      <span
                        className={`ml-2 h-4 w-4 rounded-full border ${
                          role === "child"
                            ? "border-violet-300 bg-violet-400"
                            : "border-slate-500"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {role === "child" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-200">
                      Family ID
                    </label>
                    <input
                      type="text"
                      value={familyId}
                      onChange={(e) => setFamilyId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                      required={role === "child"}
                      placeholder="Ask your parent for this number"
                    />
                    <p className="mt-1 text-[0.7rem] text-slate-500">
                      Your parent can find the Family ID at the top of their
                      dashboard.
                    </p>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-50 shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {loading
                ? "Working..."
                : isSignup
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-sky-300 hover:text-sky-200"
            >
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>

          <Link
            href="/"
            className="mt-3 block text-center text-[0.7rem] text-slate-500 hover:text-slate-300"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
