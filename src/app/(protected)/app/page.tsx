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
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  useEffect(() => {
    (async () => {
      if (!me?.shopId) return;

      const dayKey = formatDayKeyAR(now);
      const monthKey = formatMonthKeyAR(now);

      const dayRef = doc(firebaseDb, `shops/${me.shopId}/daily_summaries/${dayKey}`);
      const monthRef = doc(firebaseDb, `shops/${me.shopId}/monthly_summaries/${monthKey}`);

      const [ds, ms] = await Promise.all([getDoc(dayRef), getDoc(monthRef)]);
      setToday(ds.exists() ? ds.data() : null);
      setMonth(ms.exists() ? ms.data() : null);
    })();
  }, [me?.shopId]);

  if (loading) return <div className="p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  const todaySalesCents = today?.salesTotalCents ?? 0;
  const todaySalesCount = today?.salesCount ?? 0;
  const todayCashNetCents = today?.cashNetCents ?? 0;
  const monthSalesCents = month?.salesTotalCents ?? 0;
  const monthSalesCount = month?.salesCount ?? 0;
  const monthCashNetCents = month?.cashNetCents ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-red-500/20 bg-zinc-900/60 p-6 shadow-[0_20px_60px_-35px_rgba(248,113,113,0.6)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-red-300/80">
                Panel diario de carnicería
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-50 sm:text-3xl">
                {greeting}, {me?.displayName || "equipo"}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-300">
                Tenés a mano el pulso del negocio: ventas, caja neta y el rendimiento mensual sin
                abrir cada comprobante.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-200">
                {new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" }).format(
                  now,
                )}
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
                Resumen en tiempo real
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Resumen de hoy</h2>
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase text-red-200">
                Turno activo
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Ventas</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-50">
                  {centsToARS(todaySalesCents)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{todaySalesCount} tickets emitidos</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Caja neta</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-50">
                  {centsToARS(todayCashNetCents)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">Total después de ajustes</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Resumen del mes</h2>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase text-amber-200">
                Meta mensual
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Ventas</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-50">
                  {centsToARS(monthSalesCents)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{monthSalesCount} operaciones</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Caja neta</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-50">
                  {centsToARS(monthCashNetCents)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">Visión completa del mes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-lg font-semibold text-zinc-100">Indicadores rápidos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Ticket promedio hoy",
                  value: todaySalesCount ? centsToARS(Math.round(todaySalesCents / todaySalesCount)) : "—",
                  note: "Promedio por venta",
                },
                {
                  label: "Ticket promedio mes",
                  value: monthSalesCount ? centsToARS(Math.round(monthSalesCents / monthSalesCount)) : "—",
                  note: "Promedio mensual",
                },
                {
                  label: "Comparativo rápido",
                  value:
                    monthSalesCents > 0
                      ? `${Math.round((todaySalesCents / monthSalesCents) * 100)}%`
                      : "—",
                  note: "Del mes en un día",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <p className="text-xs uppercase tracking-wider text-zinc-400">{item.label}</p>
                  <p className="mt-3 text-xl font-semibold text-zinc-50">{item.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-lg font-semibold text-zinc-100">Checklist del día</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              {[
                "Revisar stock crítico y pedidos especiales.",
                "Actualizar precios según proveedores.",
                "Cerrar caja parcial antes del cambio de turno.",
                "Preparar reportes para fin de día.",
              ].map((task) => (
                <li key={task} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-400" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-400">
              Tip: si el tráfico sube, priorizá ventas rápidas y cortes premium en la vitrina.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
