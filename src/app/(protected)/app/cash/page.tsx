"use client";

import { useState } from "react";
import { useMe } from "@/lib/auth/useMe";
import { createCashMovement } from "@/lib/cash/client";
import type { PaymentMethod } from "@/lib/cash/types";

function centsToARS(cents: number) {
  return (cents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
}

export default function CashPage() {
  const { me, loading } = useMe();

  const [direction, setDirection] = useState<"in" | "out">("out");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [category, setCategory] = useState("proveedor");
  const [amountARS, setAmountARS] = useState("5000");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const amountCents = Math.round(Number(amountARS || 0) * 100);

  async function submit() {
    setMsg(null);
    if (!me) return setMsg("No autenticado");
    if (!category.trim()) return setMsg("Categoría requerida");
    if (!Number.isInteger(amountCents) || amountCents <= 0) return setMsg("Monto inválido");

    setBusy(true);
    try {
      await createCashMovement({
        direction,
        method,
        category: category.trim(),
        amountCents,
        note: note.trim() || undefined,
      });
      setMsg(`✅ Movimiento creado (${direction === "in" ? "Ingreso" : "Egreso"} ${centsToARS(amountCents)})`);
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Error"}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="p-6 text-zinc-100">
      <h1 className="text-xl font-semibold">Caja</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Acá registrás ingresos/egresos manuales. (Las ventas ya crean ingresos automáticamente.)
      </p>

      <div className="mt-6 grid gap-4 rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Tipo</label>
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
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Método</label>
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
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Categoría</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
            placeholder="proveedor, alquiler, sueldos..."
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Monto ($ ARS)</label>
          <input
            value={amountARS}
            onChange={(e) => setAmountARS(e.target.value)}
            className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
          />
          <p className="text-xs text-zinc-400">Se guarda como centavos: {amountCents}.</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Nota (opcional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
            placeholder="Ej: Factura 0001-000123"
          />
        </div>

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
    </div>
  );
}
