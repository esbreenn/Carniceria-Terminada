"use client";

import { useMemo } from "react";

type Props = {
  title: string;
  labels: string[];          // ["01","02",...]
  valuesCents: number[];     // [0,0,500000,...]
};

function centsToARS(cents: number) {
  return (cents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
}

export default function DashboardChart({ title, labels, valuesCents }: Props) {
  const { max, total, nonZeroCount } = useMemo(() => {
    const max = Math.max(0, ...valuesCents.map((n) => Number(n || 0)));
    const total = valuesCents.reduce((a, b) => a + Number(b || 0), 0);
    const nonZeroCount = valuesCents.filter((n) => Number(n || 0) > 0).length;
    return { max, total, nonZeroCount };
  }, [valuesCents]);

  return (
    <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-6 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-50">{title}</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Total: <span className="font-semibold text-zinc-200">{centsToARS(total)}</span>
            <span className="ml-2 text-zinc-500">• días con ventas: {nonZeroCount}</span>
          </p>
        </div>

        <div className="rounded-full border border-white/5 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
          Mes
        </div>
      </div>

      <div className="mt-5">
        <div className="flex h-28 items-end gap-1.5">
          {valuesCents.map((v, i) => {
            const value = Number(v || 0);
            const pct = max > 0 ? value / max : 0;
            const h = Math.max(2, Math.round(pct * 112)); // px aprox
            return (
              <div key={labels[i] ?? i} className="group relative flex-1">
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-amber-500/20 to-amber-400/80"
                  style={{ height: `${h}px` }}
                />
                {/* tooltip simple */}
                <div className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-200 group-hover:block">
                  {labels[i] ?? "--"}: {centsToARS(value)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex justify-between text-[11px] text-zinc-500">
          <span>{labels[0] ?? "01"}</span>
          <span>{labels[Math.floor(labels.length / 2)] ?? ""}</span>
          <span>{labels[labels.length - 1] ?? "31"}</span>
        </div>

        {max === 0 && (
          <div className="mt-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-xs text-zinc-400">
            Todavía no hay ventas cargadas este mes (o todavía no se actualizó la serie). Registrá una venta y recargá.
          </div>
        )}
      </div>
    </div>
  );
}
