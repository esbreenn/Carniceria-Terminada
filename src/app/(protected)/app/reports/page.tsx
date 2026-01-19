"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useMe } from "@/lib/auth/useMe";
import type { DailySummary, MonthlySummary, SummaryMap } from "@/lib/reports/summary";
import { pickSalesByMethod } from "@/lib/reports/summary";

function centsToARS(cents: number) {
  return (cents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function todayKeyAR() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function thisMonthKeyAR() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}`;
}

function rowsFromMap(map: SummaryMap) {
  return Object.entries(map)
    .map(([k, v]) => ({ k, v: Number(v || 0) }))
    .sort((a, b) => b.v - a.v);
}

export default function ReportsPage() {
  const { me, loading } = useMe();

  const [dayKey, setDayKey] = useState<string>(() => todayKeyAR());
  const [monthKey, setMonthKey] = useState<string>(() => thisMonthKeyAR());

  const [daily, setDaily] = useState<DailySummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const derived = useMemo(() => {
    const salesDay = Number(daily?.salesTotalCents ?? 0);
    const salesMonth = Number(monthly?.salesTotalCents ?? 0);

    const inDay = Number(daily?.cashInCents ?? 0);
    const outDay = Number(daily?.cashOutCents ?? 0);
    const netDay = Number(daily?.cashNetCents ?? 0);

    const inMonth = Number(monthly?.cashInCents ?? 0);
    const outMonth = Number(monthly?.cashOutCents ?? 0);
    const netMonth = Number(monthly?.cashNetCents ?? 0);

    // ✅ neto simple negocio: ingresos - egresos
    // (con nuestro patch, ingresos incluye ventas + ingresos manuales)
    const simpleNetDay = inDay - outDay;
    const simpleNetMonth = inMonth - outMonth;

    return {
      salesDay,
      salesMonth,
      inDay,
      outDay,
      netDay,
      inMonth,
      outMonth,
      netMonth,
      simpleNetDay,
      simpleNetMonth,
    };
  }, [daily, monthly]);

  async function load() {
    if (!me?.shopId) return;
    setBusy(true);
    setMsg(null);
    try {
      const dayRef = doc(firebaseDb, `shops/${me.shopId}/daily_summaries/${dayKey}`);
      const monthRef = doc(firebaseDb, `shops/${me.shopId}/monthly_summaries/${monthKey}`);

      const [ds, ms] = await Promise.all([getDoc(dayRef), getDoc(monthRef)]);
      setDaily(ds.exists() ? (ds.data() as DailySummary) : null);
      setMonthly(ms.exists() ? (ms.data() as MonthlySummary) : null);

      if (!ds.exists() && !ms.exists()) setMsg("No hay datos para ese día/mes todavía.");
    } catch (e: any) {
      setMsg(e?.message || "Error cargando reportes");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.shopId]);

  if (loading) return <div className="p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  const salesByMethodDay = rowsFromMap(pickSalesByMethod(daily));
  const salesByMethodMonth = rowsFromMap(pickSalesByMethod(monthly));

  const cashInByMethodDay = rowsFromMap((daily?.cashInByMethod || {}) as SummaryMap);
  const cashOutByMethodDay = rowsFromMap((daily?.cashOutByMethod || {}) as SummaryMap);

  const cashInByMethodMonth = rowsFromMap((monthly?.cashInByMethod || {}) as SummaryMap);
  const cashOutByMethodMonth = rowsFromMap((monthly?.cashOutByMethod || {}) as SummaryMap);

  return (
    <div className="p-6 text-zinc-100">
      <h1 className="text-xl font-semibold">Reportes</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Lee solo <code>daily_summaries</code> y <code>monthly_summaries</code>. Nada de escanear ventas una por una.
      </p>

      <div className="mt-6 grid gap-3 rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Día</label>
          <input
            type="date"
            value={dayKey}
            onChange={(e) => setDayKey(e.target.value)}
            className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Mes</label>
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
          />
        </div>

        <div className="flex items-end">
          <button
            disabled={busy}
            onClick={load}
            className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
          >
            {busy ? "Cargando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800 text-sm">
          {msg}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold">Día {dayKey}</h2>
          <div className="mt-3 space-y-1 text-sm text-zinc-300">
            <div>Ventas: <b>{centsToARS(derived.salesDay)}</b> ({daily?.salesCount ?? 0})</div>
            <div>Ingresos caja: <b>{centsToARS(derived.inDay)}</b></div>
            <div>Egresos caja: <b>{centsToARS(derived.outDay)}</b></div>
            <div>Neto caja (firmado): <b>{centsToARS(derived.netDay)}</b></div>
            <div>Neto simple (ingresos - egresos): <b>{centsToARS(derived.simpleNetDay)}</b></div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold">Mes {monthKey}</h2>
          <div className="mt-3 space-y-1 text-sm text-zinc-300">
            <div>Ventas: <b>{centsToARS(derived.salesMonth)}</b> ({monthly?.salesCount ?? 0})</div>
            <div>Ingresos caja: <b>{centsToARS(derived.inMonth)}</b></div>
            <div>Egresos caja: <b>{centsToARS(derived.outMonth)}</b></div>
            <div>Neto caja (firmado): <b>{centsToARS(derived.netMonth)}</b></div>
            <div>Neto simple (ingresos - egresos): <b>{centsToARS(derived.simpleNetMonth)}</b></div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h3 className="font-semibold">Ventas por método (día)</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-300">
            {salesByMethodDay.length === 0 && <li className="text-zinc-500">Sin datos</li>}
            {salesByMethodDay.map((r) => (
              <li key={r.k} className="flex justify-between">
                <span>{r.k}</span>
                <span>{centsToARS(r.v)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h3 className="font-semibold">Ventas por método (mes)</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-300">
            {salesByMethodMonth.length === 0 && <li className="text-zinc-500">Sin datos</li>}
            {salesByMethodMonth.map((r) => (
              <li key={r.k} className="flex justify-between">
                <span>{r.k}</span>
                <span>{centsToARS(r.v)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h3 className="font-semibold">Caja ingresos por método (día)</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-300">
            {cashInByMethodDay.length === 0 && <li className="text-zinc-500">Sin datos</li>}
            {cashInByMethodDay.map((r) => (
              <li key={r.k} className="flex justify-between">
                <span>{r.k}</span>
                <span>{centsToARS(r.v)}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 font-semibold">Caja egresos por método (día)</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-300">
            {cashOutByMethodDay.length === 0 && <li className="text-zinc-500">Sin datos</li>}
            {cashOutByMethodDay.map((r) => (
              <li key={r.k} className="flex justify-between">
                <span>{r.k}</span>
                <span>{centsToARS(r.v)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h3 className="font-semibold">Caja ingresos por método (mes)</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-300">
            {cashInByMethodMonth.length === 0 && <li className="text-zinc-500">Sin datos</li>}
            {cashInByMethodMonth.map((r) => (
              <li key={r.k} className="flex justify-between">
                <span>{r.k}</span>
                <span>{centsToARS(r.v)}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 font-semibold">Caja egresos por método (mes)</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-300">
            {cashOutByMethodMonth.length === 0 && <li className="text-zinc-500">Sin datos</li>}
            {cashOutByMethodMonth.map((r) => (
              <li key={r.k} className="flex justify-between">
                <span>{r.k}</span>
                <span>{centsToARS(r.v)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
