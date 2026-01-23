"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useMe } from "@/lib/auth/useMe";

function formatDayKeyAR(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatMonthKeyAR(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}`;
}

function centsToARS(cents: number) {
  return (cents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function DashboardPage() {
  const { me, loading } = useMe();
  const [today, setToday] = useState<any>(null);
  const [month, setMonth] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!me?.shopId) return;

      const now = new Date();
      const dayKey = formatDayKeyAR(now);
      const monthKey = formatMonthKeyAR(now);

      const dayRef = doc(firebaseDb, `shops/${me.shopId}/daily_summaries/${dayKey}`);
      const monthRef = doc(firebaseDb, `shops/${me.shopId}/monthly_summaries/${monthKey}`);

      const [ds, ms] = await Promise.all([getDoc(dayRef), getDoc(monthRef)]);
      setToday(ds.exists() ? ds.data() : null);
      setMonth(ms.exists() ? ms.data() : null);
    })();
  }, [me?.shopId]);

  if (loading) return <div className="min-h-screen bg-zinc-950 p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="min-h-screen bg-zinc-950 p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-6 rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/80 via-zinc-950/80 to-black/80 p-6 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              Carnicería premium
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
            <p className="text-sm text-zinc-400 md:text-base">
              Este dashboard lee SOLO resúmenes (no 5000 documentos). Rápido y barato.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900/70 to-zinc-950/70 p-5 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-100">Hoy</h2>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-200">
                  En vivo
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Ventas</span>
                  <span className="text-base font-semibold text-zinc-100">
                    {centsToARS(today?.salesTotalCents ?? 0)}
                    <span className="ml-2 text-xs font-medium text-zinc-400">
                      ({today?.salesCount ?? 0})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Caja neta</span>
                  <span className="text-base font-semibold text-zinc-100">
                    {centsToARS(today?.cashNetCents ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900/70 to-zinc-950/70 p-5 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-100">Este mes</h2>
                <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-200">
                  Resumen
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Ventas</span>
                  <span className="text-base font-semibold text-zinc-100">
                    {centsToARS(month?.salesTotalCents ?? 0)}
                    <span className="ml-2 text-xs font-medium text-zinc-400">
                      ({month?.salesCount ?? 0})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Caja neta</span>
                  <span className="text-base font-semibold text-zinc-100">
                    {centsToARS(month?.cashNetCents ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-zinc-900/40 px-5 py-4 text-xs text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300">
              Indicador operativo
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-950/60 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Resúmenes sincronizados
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-950/60 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Reporte diario activo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
