"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useMe } from "@/lib/auth/useMe";
import DashboardHome from "@/app/components/DashboardHome";

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

export default function DashboardPage() {
  const { me, loading } = useMe();
  const [today, setToday] = useState<any>(null);
  const [month, setMonth] = useState<any>(null);
  const now = new Date();

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
    <DashboardHome
      displayName={me?.displayName || "equipo"}
      now={now}
      todaySalesCents={todaySalesCents}
      todaySalesCount={todaySalesCount}
      todayCashNetCents={todayCashNetCents}
      monthSalesCents={monthSalesCents}
      monthSalesCount={monthSalesCount}
      monthCashNetCents={monthCashNetCents}
    />
  );
}
