"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useMe } from "@/lib/auth/useMe";
import DashboardChart from "@/app/components/DashboardChart";

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

type DashboardSeries = {
  labels: string[]; // ["01","02",...]
  dailySalesCents: number[];
  dailyNetCents?: number[]; // opcional
  updatedAt?: number;
};

function daysInMonthAR(now = new Date()) {
  const y = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
    }).format(now)
  );
  const m = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      month: "2-digit",
    }).format(now)
  );
  return new Date(y, m, 0).getDate();
}

function buildEmptySeries(now = new Date()): DashboardSeries {
  const dim = daysInMonthAR(now);
  const labels = Array.from({ length: dim }, (_, i) => String(i + 1).padStart(2, "0"));
  return {
    labels,
    dailySalesCents: Array(dim).fill(0),
    dailyNetCents: Array(dim).fill(0),
    updatedAt: Date.now(),
  };
}

export default function DashboardPage() {
  const { me, loading } = useMe();

  const [today, setToday] = useState<any>(null);
  const [month, setMonth] = useState<any>(null);
  const [series, setSeries] = useState<DashboardSeries | null>(null);

  const monthKey = useMemo(() => formatMonthKeyAR(new Date()), []);

  useEffect(() => {
    (async () => {
      if (!me?.shopId) return;

      const now = new Date();
      const dayKey = formatDayKeyAR(now);

      const dayRef = doc(firebaseDb, `shops/${me.shopId}/daily_summaries/${dayKey}`);
      const monthRef = doc(firebaseDb, `shops/${me.shopId}/monthly_summaries/${monthKey}`);
      const seriesRef = doc(firebaseDb, `shops/${me.shopId}/dashboard_series/${monthKey}`);

      const [ds, ms, ss] = await Promise.all([getDoc(dayRef), getDoc(monthRef), getDoc(seriesRef)]);

      setToday(ds.exists() ? ds.data() : null);
      setMonth(ms.exists() ? ms.data() : null);

      if (ss.exists()) {
        setSeries(ss.data() as DashboardSeries);
      } else {
        const empty = buildEmptySeries(now);
        await setDoc(seriesRef, empty, { merge: true });
        setSeries(empty);
      }
    })();
  }, [me?.shopId, monthKey]);

  const chartLabels = useMemo(() => (series?.labels && Array.isArray(series.labels) ? series.labels : []), [series]);
  const chartSales = useMemo(
    () => (series?.dailySalesCents && Array.isArray(series.dailySalesCents) ? series.dailySalesCents.map((n) => Number(n || 0)) : []),
    [series]
  );

  if (loading) return <div className="min-h-screen bg-zinc-950 p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="min-h-screen bg-zinc-950 p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/80 via-zinc-950/80 to-black/90 p-6 shadow-2xl shadow-black/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,180,80,0.14),_transparent_55%)]" />

          <div className="relative z-10 flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200">
              Carnicería premium
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-4xl">Dashboard</h1>
            <p className="max-w-2xl text-sm leading-snug text-zinc-400 md:text-base">
              Resumen del rendimiento de tu carnicería hoy y este mes.
            </p>
          </div>

          <div className="relative z-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-6 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-zinc-50">Hoy</h2>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
                  En vivo
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ventas</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
                    {centsToARS(today?.salesTotalCents ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">Operaciones: {today?.salesCount ?? 0}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Caja neta</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
                    {centsToARS(today?.cashNetCents ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">Estimado diario</p>
                </div>
              </div>

              {/* ✅ GRÁFICO REAL */}
              <div className="mt-6">
                <DashboardChart
                  title={`Ventas diarias (${monthKey})`}
                  labels={chartLabels}
                  valuesCents={chartSales}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-5 shadow-lg shadow-black/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold tracking-tight text-zinc-50">Este mes</h2>
                  <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-indigo-200">
                    Resumen
                  </span>
                </div>

                <div className="mt-4 space-y-4 text-sm text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Ventas</span>
                    <span className="text-base font-semibold text-zinc-100">
                      {centsToARS(month?.salesTotalCents ?? 0)}
                      <span className="ml-2 text-xs font-medium text-zinc-400">({month?.salesCount ?? 0})</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Caja neta</span>
                    <span className="text-base font-semibold text-zinc-100">{centsToARS(month?.cashNetCents ?? 0)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 px-5 py-4 text-xs text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300">Indicador operativo</span>
                <div className="mt-3 flex flex-col gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-950/60 px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Resúmenes sincronizados
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-950/60 px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Serie mensual lista para gráfico
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
