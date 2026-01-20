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
    };
  }, [items]);

  if (loading) return <div className="p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="p-6 text-zinc-100 space-y-6">
      <h1 className="text-xl font-semibold">Caja</h1>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
          <p className="text-xs text-zinc-400">Ingresos</p>
          <p className="font-semibold">{centsToARS(totals.income)}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
          <p className="text-xs text-zinc-400">Egresos</p>
          <p className="font-semibold">{centsToARS(totals.expense)}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
          <p className="text-xs text-zinc-400">Neto</p>
          <p className="font-semibold">{centsToARS(totals.net)}</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="grid gap-4 rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
        <div className="flex gap-2">
          <button
            onClick={() => setDirection("in")}
            className={`rounded-xl px-3 py-2 ring-1 ring-zinc-800 ${
              direction === "in" ? "bg-zinc-100 text-zinc-950" : "bg-zinc-950"
            }`}
          >
            Ingreso
          </button>
          <button
            onClick={() => setDirection("out")}
            className={`rounded-xl px-3 py-2 ring-1 ring-zinc-800 ${
              direction === "out" ? "bg-zinc-100 text-zinc-950" : "bg-zinc-950"
            }`}
          >
            Egreso
          </button>
        </div>

        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
        >
          <option value="cash">cash</option>
          <option value="transfer">transfer</option>
          <option value="debit">debit</option>
          <option value="credit">credit</option>
          <option value="mp">mp</option>
        </select>

        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
          placeholder="proveedor, alquiler, sueldos..."
        />

        <input
          value={amountARS}
          onChange={(e) => setAmountARS(e.target.value)}
          className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
          placeholder="Monto en ARS"
        />

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
          placeholder="Nota (opcional)"
        />

        {msg && (
          <div className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800 text-sm">
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
        <h2 className="text-sm font-semibold text-zinc-300">
          Movimientos recientes
        </h2>

        {items.length === 0 && (
          <p className="text-sm text-zinc-400">Sin movimientos.</p>
        )}

        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-xl bg-zinc-900/40 px-4 py-2 ring-1 ring-zinc-800"
          >
            <div>
              <p className="text-sm">
                {m.direction === "in" ? "➕" : "➖"} {m.category}
              </p>
              <p className="text-xs text-zinc-400">{m.method}</p>
            </div>
            <div className="font-semibold">
              {centsToARS(m.amountCents)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
