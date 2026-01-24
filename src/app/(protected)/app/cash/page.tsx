"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/lib/auth/useMe";
import { createCashMovement, listCashMovements } from "@/lib/cash/client";
import type { PaymentMethod, CashDirection, CashMovement } from "@/lib/cash/types";

function centsToARS(cents: number) {
  return (cents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CashPage() {
  const { me, loading } = useMe();

  const [direction, setDirection] = useState<CashDirection>("out");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [category, setCategory] = useState("proveedor");
  const [amountARS, setAmountARS] = useState("5000");
  const [note, setNote] = useState("");

  const [items, setItems] = useState<CashMovement[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const amountCents = Math.round(Number(amountARS || 0) * 100);
  const methodLabels: Record<PaymentMethod, string> = {
    cash: "Efectivo",
    transfer: "Transferencia",
    debit: "Débito",
    credit: "Crédito",
    mp: "Mercado Pago",
  };

  async function load() {
    if (!me) return;
    const rows = await listCashMovements(me.shopId, 50);
    setItems(rows);
  }

  async function submit() {
    setMsg(null);
    if (!me) return setMsg("No autenticado");
    if (!category.trim()) return setMsg("Categoría requerida");
    if (!Number.isInteger(amountCents) || amountCents <= 0)
      return setMsg("Monto inválido");

    setBusy(true);
    try {
      await createCashMovement(me.shopId, {
        direction,
        method,
        category: category.trim(),
        amountCents,
        note: note.trim() || undefined,
      });

      setMsg("✅ Movimiento registrado");
      setNote("");
      await load();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Error"}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (me) load();
  }, [me]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const m of items) {
      if (m.direction === "in") income += m.amountCents;
      else expense += m.amountCents;
    }

    return {
      income,
      expense,
      net: income - expense,
      count: items.length,
    };
  }, [items]);

  if (loading) return <div className="p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="space-y-6 p-6 text-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Caja</h1>
          <p className="text-sm text-zinc-400">
            Registrá ingresos y egresos con detalle de método, categoría y notas.
          </p>
        </div>
        <div className="rounded-full bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800">
          {totals.count} movimientos registrados
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
            Ingresos
          </p>
          <p className="mt-2 text-lg font-semibold text-emerald-100">
            {centsToARS(totals.income)}
          </p>
        </div>
        <div className="rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-500/20">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200/70">
            Egresos
          </p>
          <p className="mt-2 text-lg font-semibold text-rose-100">
            {centsToARS(totals.expense)}
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            Neto
          </p>
          <p className="mt-2 text-lg font-semibold">{centsToARS(totals.net)}</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="grid gap-4 rounded-2xl bg-zinc-900/40 p-5 ring-1 ring-zinc-800">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Tipo de movimiento
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setDirection("in")}
              className={`rounded-xl px-4 py-2 text-sm ring-1 ring-zinc-800 ${
                direction === "in"
                  ? "bg-zinc-100 text-zinc-950"
                  : "bg-zinc-950"
              }`}
            >
              Ingreso
            </button>
            <button
              onClick={() => setDirection("out")}
              className={`rounded-xl px-4 py-2 text-sm ring-1 ring-zinc-800 ${
                direction === "out"
                  ? "bg-zinc-100 text-zinc-950"
                  : "bg-zinc-950"
              }`}
            >
              Egreso
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-zinc-400">
            Método de pago
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            >
              {Object.entries(methodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-zinc-400">
            Categoría
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="cash-category"
              className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Proveedor, alquiler, sueldos..."
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-zinc-400">
            Monto en ARS
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={amountARS}
              onChange={(e) => setAmountARS(e.target.value)}
              className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Ej: 5000"
            />
          </label>

          <label className="grid gap-2 text-sm text-zinc-400">
            Nota (opcional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Detalle breve para el movimiento"
            />
          </label>
        </div>

        <datalist id="cash-category">
          <option value="Proveedor" />
          <option value="Alquiler" />
          <option value="Sueldos" />
          <option value="Servicios" />
          <option value="Mantenimiento" />
        </datalist>

        {msg && (
          <div className="rounded-xl bg-zinc-950 p-3 text-sm text-zinc-200 ring-1 ring-zinc-800">
            {msg}
          </div>
        )}

        <button
          disabled={busy}
          onClick={submit}
          className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Registrar movimiento"}
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <h2 className="font-semibold text-zinc-300">Movimientos recientes</h2>
          <span>Últimos 50 registros</span>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-zinc-400">Sin movimientos.</p>
        )}

        {items.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-900/40 px-4 py-3 ring-1 ring-zinc-800"
          >
            <div>
              <p className="text-sm">
                {m.direction === "in" ? "➕" : "➖"} {m.category}
              </p>
              <p className="text-xs text-zinc-400">
                {methodLabels[m.method]} · {formatDate(m.createdAt)}
              </p>
              {m.note && (
                <p className="text-xs text-zinc-500">{m.note}</p>
              )}
            </div>
            <div className="text-right font-semibold">
              {centsToARS(m.amountCents)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
