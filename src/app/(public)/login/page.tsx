"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await cred.user.getIdToken();

      // 1) Crear sesión (cookie)
      const r1 = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!r1.ok) {
        const data = await r1.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo crear sesión");
      }

      // 2) Crear users/{uid} y shops/{shopId}
      const r2 = await fetch("/api/users/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!r2.ok) {
        const data = await r2.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo crear usuario en Firestore");
      }

      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Error de login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-2xl bg-zinc-900/40 p-6 ring-1 ring-zinc-800">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
              🥩
            </div>
            <div>
              <p className="text-lg font-semibold leading-5">CARNICERÍA PANEL</p>
              <p className="text-sm text-zinc-400">Login con Firebase</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              className="w-full rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="w-full rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-xl bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
