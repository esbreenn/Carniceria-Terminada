import React from "react";

type DashboardHomeProps = {
  displayName: string;
  now: Date;
  todaySalesCents: number;
  todaySalesCount: number;
  todayCashNetCents: number;
  monthSalesCents: number;
  monthSalesCount: number;
  monthCashNetCents: number;
};

function centsToARS(cents: number) {
  return (cents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function getMonthTotals(now: Date) {
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { dayOfMonth, daysInMonth };
}

export default function DashboardHome({
  displayName,
  now,
  todaySalesCents,
  todaySalesCount,
  todayCashNetCents,
  monthSalesCents,
  monthSalesCount,
  monthCashNetCents,
}: DashboardHomeProps) {
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const todayLabel = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const { dayOfMonth, daysInMonth } = getMonthTotals(now);
  const averageDailySalesCents = dayOfMonth ? Math.round(monthSalesCents / dayOfMonth) : 0;
  const projectedMonthSalesCents = Math.round(averageDailySalesCents * daysInMonth);
  const monthProgress =
    projectedMonthSalesCents > 0
      ? Math.min(100, Math.round((monthSalesCents / projectedMonthSalesCents) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="rounded-3xl border border-red-500/20 bg-zinc-900/60 p-6 shadow-[0_20px_60px_-35px_rgba(248,113,113,0.6)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-red-300/80">
                Centro de mando diario
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-50 sm:text-3xl">
                {greeting}, {displayName}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-300">
                Visualizá el ritmo de la carnicería con indicadores clave, proyección mensual y
                tareas sugeridas para mantener la operación en marcha.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-200">
                <span className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2">
                  {todayLabel}
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2">
                  Actualizado {timeLabel}
                </span>
                <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sky-200">
                  Operación activa
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Ventas hoy",
                  value: centsToARS(todaySalesCents),
                  note: `${todaySalesCount} tickets`,
                },
                {
                  label: "Caja neta",
                  value: centsToARS(todayCashNetCents),
                  note: "Después de ajustes",
                },
                {
                  label: "Ventas mes",
                  value: centsToARS(monthSalesCents),
                  note: `${monthSalesCount} operaciones`,
                },
                {
                  label: "Caja mes",
                  value: centsToARS(monthCashNetCents),
                  note: "Balance acumulado",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                >
                  <p className="text-xs uppercase tracking-wider text-zinc-400">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-zinc-50">{item.value}</p>
                  <p className="mt-1 text-xs text-zinc-400">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Impulso del mes</h2>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase text-amber-200">
                Proyección
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-300">
              Promedio diario de ventas y proyección estimada para que puedas anticipar compras y
              personal.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Promedio diario</p>
                <p className="mt-3 text-xl font-semibold text-zinc-50">
                  {averageDailySalesCents ? centsToARS(averageDailySalesCents) : "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Basado en {dayOfMonth} día{dayOfMonth === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Proyección mensual</p>
                <p className="mt-3 text-xl font-semibold text-zinc-50">
                  {projectedMonthSalesCents ? centsToARS(projectedMonthSalesCents) : "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {daysInMonth} días en el mes
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-zinc-400">
                <span>Avance del mes</span>
                <span>{monthProgress}% completado</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400"
                  style={{ width: `${monthProgress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Compará el ritmo actual con la proyección para ajustar turnos o promociones.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
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

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h2 className="text-lg font-semibold text-zinc-100">Acciones sugeridas</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                {[
                  {
                    title: "Refuerzo de promociones",
                    description: "Activá combos de cortes para elevar el ticket promedio.",
                  },
                  {
                    title: "Seguimiento de clientes",
                    description: "Registrá pedidos frecuentes para anticipar demanda.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                    <p className="mt-2 text-xs text-zinc-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
