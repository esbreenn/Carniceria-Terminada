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

  if (loading) return <div className="p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="p-6 text-zinc-100">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Este dashboard lee SOLO resúmenes (no 5000 documentos). Rápido y barato.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold">Hoy</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Ventas: {centsToARS(today?.salesTotalCents ?? 0)} ({today?.salesCount ?? 0})
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Caja neta: {centsToARS(today?.cashNetCents ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
          <h2 className="font-semibold">Este mes</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Ventas: {centsToARS(month?.salesTotalCents ?? 0)} ({month?.salesCount ?? 0})
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Caja neta: {centsToARS(month?.cashNetCents ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
