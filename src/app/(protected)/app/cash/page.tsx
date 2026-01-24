"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMe } from "@/lib/auth/useMe";
import {
  createCashMovement,
  listCashMovements,
  createCashShift,
  closeCashShift,
  listCashShifts,
} from "@/lib/cash/client";
import type {
  PaymentMethod,
  CashDirection,
  CashMovement,
  CashShift,
} from "@/lib/cash/types";

const MAX_AMOUNT_ARS = 1_000_000;
const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  debit: "Débito",
  credit: "Crédito",
  mp: "Mercado Pago",
};
const DIGITAL_METHODS: PaymentMethod[] = ["transfer", "debit", "credit", "mp"];

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

function toTitleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toInputDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function CashPage() {
  const { me, loading } = useMe();

  const [direction, setDirection] = useState<CashDirection>("out");
  const [category, setCategory] = useState("Proveedor");
  const [splitMethods, setSplitMethods] = useState<
    { id: string; method: PaymentMethod; amountARS: string }[]
  >([{ id: crypto.randomUUID(), method: "cash", amountARS: "5000" }]);
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    toInputDateTime(new Date())
  );

  const [items, setItems] = useState<CashMovement[]>([]);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [shiftMsg, setShiftMsg] = useState<string | null>(null);

  const [shiftCashier, setShiftCashier] = useState("");
  const [shiftOpeningCash, setShiftOpeningCash] = useState("0");
  const [shiftOpenedAt, setShiftOpenedAt] = useState(() =>
    toInputDateTime(new Date())
  );
  const [shiftClosingCash, setShiftClosingCash] = useState("");
  const [shiftClosedAt, setShiftClosedAt] = useState(() =>
    toInputDateTime(new Date())
  );
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const totalAmountCents = splitMethods.reduce((acc, entry) => {
    return acc + Math.round(Number(entry.amountARS || 0) * 100);
  }, 0);
  const categorySuggestions = useMemo(() => {
    if (direction === "in") {
      return ["Ventas", "Ajuste", "Préstamo", "Recupero"];
    }
    return [
      "Proveedor",
      "Sueldos",
      "Servicios",
      "Flete",
      "Impuestos",
      "Mantenimiento",
      "Caja chica",
    ];
  }, [direction]);

  const canRemoveSplit = splitMethods.length > 1;

  function addSplitMethod() {
    setSplitMethods((prev) => [
      ...prev,
      { id: crypto.randomUUID(), method: "cash", amountARS: "" },
    ]);
  }

  function removeSplitMethod(id: string) {
    setSplitMethods((prev) => prev.filter((entry) => entry.id !== id));
  }

  function updateSplitMethod(id: string, updates: Partial<(typeof splitMethods)[0]>) {
    setSplitMethods((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  }

  const load = useCallback(async () => {
    if (!me) return;
    try {
      const rows = await listCashMovements(me.shopId, 50);
      setItems(rows);
    } catch (error: any) {
      setMsg(`❌ ${error?.message || "Error al cargar movimientos"}`);
    }
  }, [me]);

  const loadShifts = useCallback(async () => {
    if (!me) return;
    try {
      const rows = await listCashShifts(me.shopId, 20);
      setShifts(rows);
    } catch (error: any) {
      setShiftMsg(`❌ ${error?.message || "Error al cargar turnos"}`);
    }
  }, [me]);

  async function submit() {
    if (busy) return;
    setMsg(null);
    if (!me) return setMsg("No autenticado");
    if (!category.trim()) return setMsg("Categoría requerida");
    if (!Number.isInteger(totalAmountCents) || totalAmountCents <= 0)
      return setMsg("Monto inválido");
    if (totalAmountCents > MAX_AMOUNT_ARS * 100)
      return setMsg("Monto excede el máximo permitido");

    setBusy(true);
    try {
      const occurredAtValue = occurredAt
        ? new Date(occurredAt).getTime()
        : Date.now();
      if (occurredAt && Number.isNaN(occurredAtValue)) {
        return setMsg("Fecha inválida");
      }

      const validSplits = splitMethods
        .map((entry) => ({
          ...entry,
          amountCents: Math.round(Number(entry.amountARS || 0) * 100),
        }))
        .filter((entry) => entry.amountCents > 0);

      if (validSplits.length === 0) {
        return setMsg("Agregá al menos un método con monto válido");
      }

      if (validSplits.some((entry) => entry.amountCents > MAX_AMOUNT_ARS * 100)) {
        return setMsg("Uno de los montos excede el máximo permitido");
      }

      await Promise.all(
        validSplits.map((entry) =>
          createCashMovement(me.shopId, {
            direction,
            method: entry.method,
            category: category.trim(),
            amountCents: entry.amountCents,
            note: note.trim() || undefined,
            occurredAt: occurredAtValue,
          })
        )
      );

      setMsg("✅ Movimiento registrado");
      setNote("");
      setOccurredAt(toInputDateTime(new Date()));
      setSplitMethods([
        { id: crypto.randomUUID(), method: "cash", amountARS: "5000" },
      ]);
      await load();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function openShift() {
    if (shiftBusy) return;
    setShiftMsg(null);
    if (!me) return setShiftMsg("No autenticado");
    const openingCashCents = Math.round(Number(shiftOpeningCash || 0) * 100);
    if (!shiftCashier.trim()) return setShiftMsg("Nombre del cajero requerido");
    if (!Number.isInteger(openingCashCents) || openingCashCents < 0) {
      return setShiftMsg("Caja inicial inválida");
    }

    setShiftBusy(true);
    try {
      const openedAtValue = shiftOpenedAt
        ? new Date(shiftOpenedAt).getTime()
        : Date.now();
      if (shiftOpenedAt && Number.isNaN(openedAtValue)) {
        return setShiftMsg("Fecha de apertura inválida");
      }

      await createCashShift(me.shopId, {
        cashierName: shiftCashier,
        openingCashCents,
        openedAt: openedAtValue,
      });

      setShiftMsg("✅ Turno abierto");
      setShiftCashier("");
      setShiftOpeningCash("0");
      setShiftOpenedAt(toInputDateTime(new Date()));
      await loadShifts();
    } catch (error: any) {
      setShiftMsg(`❌ ${error?.message || "Error al abrir turno"}`);
    } finally {
      setShiftBusy(false);
    }
  }

  async function closeShift() {
    if (shiftBusy) return;
    setShiftMsg(null);
    if (!me) return setShiftMsg("No autenticado");
    if (!selectedShiftId) return setShiftMsg("Seleccioná un turno abierto");

    const shift = shifts.find((row) => row.id === selectedShiftId);
    if (!shift) return setShiftMsg("Turno no encontrado");

    const closingCashCents = Math.round(Number(shiftClosingCash || 0) * 100);
    if (!Number.isInteger(closingCashCents) || closingCashCents < 0) {
      return setShiftMsg("Caja final inválida");
    }

    const differenceCents = closingCashCents - shift.openingCashCents;

    setShiftBusy(true);
    try {
      const closedAtValue = shiftClosedAt
        ? new Date(shiftClosedAt).getTime()
        : Date.now();
      if (shiftClosedAt && Number.isNaN(closedAtValue)) {
        return setShiftMsg("Fecha de cierre inválida");
      }

      await closeCashShift(me.shopId, selectedShiftId, {
        closingCashCents,
        differenceCents,
        closedAt: closedAtValue,
      });

      setShiftMsg("✅ Turno cerrado");
      setShiftClosingCash("");
      setShiftClosedAt(toInputDateTime(new Date()));
      setSelectedShiftId(null);
      await loadShifts();
    } catch (error: any) {
      setShiftMsg(`❌ ${error?.message || "Error al cerrar turno"}`);
    } finally {
      setShiftBusy(false);
    }
  }

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  useEffect(() => {
    if (me) loadShifts();
  }, [me, loadShifts]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let cashIncome = 0;
    let cashExpense = 0;
    let digitalIncome = 0;
    let digitalExpense = 0;

    for (const m of items) {
      if (m.direction === "in") income += m.amountCents;
      else expense += m.amountCents;

      const isDigital = DIGITAL_METHODS.includes(m.method);
      if (m.direction === "in") {
        if (isDigital) digitalIncome += m.amountCents;
        else cashIncome += m.amountCents;
      } else {
        if (isDigital) digitalExpense += m.amountCents;
        else cashExpense += m.amountCents;
      }
    }

    return {
      income,
      expense,
      net: income - expense,
      count: items.length,
      cashNet: cashIncome - cashExpense,
      digitalNet: digitalIncome - digitalExpense,
    };
  }, [items]);

  const breakdownByMethod = useMemo(() => {
    const byMethod = new Map<PaymentMethod, { in: number; out: number }>();
    for (const methodKey of Object.keys(METHOD_LABELS) as PaymentMethod[]) {
      byMethod.set(methodKey, { in: 0, out: 0 });
    }

    for (const movement of items) {
      const entry = byMethod.get(movement.method);
      if (!entry) continue;
      if (movement.direction === "in") entry.in += movement.amountCents;
      else entry.out += movement.amountCents;
    }

    return Array.from(byMethod.entries()).map(([methodKey, values]) => ({
      method: methodKey,
      ...values,
    }));
  }, [items]);

  const openShifts = useMemo(
    () => shifts.filter((shift) => shift.status === "open"),
    [shifts]
  );

  const selectedShift = useMemo(
    () => shifts.find((shift) => shift.id === selectedShiftId) ?? null,
    [shifts, selectedShiftId]
  );

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

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            Caja física (efectivo)
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {centsToARS(totals.cashNet)}
          </p>
        </div>
        <div className="rounded-2xl bg-indigo-500/10 p-4 ring-1 ring-indigo-500/20">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">
            Digital (MP/transfer/tarjeta)
          </p>
          <p className="mt-2 text-lg font-semibold text-indigo-100">
            {centsToARS(totals.digitalNet)}
          </p>
        </div>
      </div>

      {/* Turnos y arqueo */}
      <div className="grid gap-4 rounded-2xl bg-zinc-900/40 p-5 ring-1 ring-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Turnos y arqueo por cajero
            </h2>
            <p className="text-sm text-zinc-400">
              Registrá apertura/cierre con caja inicial/final y diferencias.
            </p>
          </div>
          <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800">
            {shifts.length} turnos
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 rounded-2xl bg-zinc-950/60 p-4 ring-1 ring-zinc-800">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Apertura de turno
            </p>
            <label className="grid gap-2 text-sm text-zinc-400">
              Cajero/a
              <input
                value={shiftCashier}
                onChange={(e) => setShiftCashier(e.target.value)}
                disabled={shiftBusy}
                className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
                placeholder="Nombre del cajero"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              Caja inicial (ARS)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={shiftOpeningCash}
                onChange={(e) => setShiftOpeningCash(e.target.value)}
                disabled={shiftBusy}
                className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
                placeholder="Ej: 15000"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              Fecha de apertura
              <input
                type="datetime-local"
                value={shiftOpenedAt}
                onChange={(e) => setShiftOpenedAt(e.target.value)}
                disabled={shiftBusy}
                className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
              />
            </label>
            <button
              type="button"
              onClick={openShift}
              disabled={shiftBusy}
              className="rounded-xl bg-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-100 disabled:opacity-60"
            >
              {shiftBusy ? "Guardando…" : "Abrir turno"}
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl bg-zinc-950/60 p-4 ring-1 ring-zinc-800">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Cierre y arqueo
            </p>
            <label className="grid gap-2 text-sm text-zinc-400">
              Turno abierto
              <select
                value={selectedShiftId ?? ""}
                onChange={(e) =>
                  setSelectedShiftId(e.target.value || null)
                }
                disabled={shiftBusy}
                className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
              >
                <option value="">Seleccionar turno</option>
                {openShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.cashierName} · {formatDate(shift.openedAt)}
                  </option>
                ))}
              </select>
            </label>
            {selectedShift && (
              <div className="rounded-xl bg-zinc-900/60 p-3 text-xs text-zinc-300 ring-1 ring-zinc-800">
                <p>
                  Caja inicial:{" "}
                  <span className="font-semibold">
                    {centsToARS(selectedShift.openingCashCents)}
                  </span>
                </p>
                <p>
                  Abierto:{" "}
                  <span className="font-semibold">
                    {formatDate(selectedShift.openedAt)}
                  </span>
                </p>
              </div>
            )}
            <label className="grid gap-2 text-sm text-zinc-400">
              Caja final (ARS)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={shiftClosingCash}
                onChange={(e) => setShiftClosingCash(e.target.value)}
                disabled={shiftBusy}
                className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
                placeholder="Ej: 18000"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              Fecha de cierre
              <input
                type="datetime-local"
                value={shiftClosedAt}
                onChange={(e) => setShiftClosedAt(e.target.value)}
                disabled={shiftBusy}
                className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
              />
            </label>
            {selectedShift && shiftClosingCash && (
              <div className="rounded-xl bg-zinc-900/60 p-3 text-xs text-zinc-300 ring-1 ring-zinc-800">
                Diferencia:{" "}
                <span className="font-semibold">
                  {centsToARS(
                    Math.round(Number(shiftClosingCash || 0) * 100) -
                      selectedShift.openingCashCents
                  )}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={closeShift}
              disabled={shiftBusy}
              className="rounded-xl bg-rose-200 px-4 py-3 text-sm font-semibold text-rose-950 hover:bg-rose-100 disabled:opacity-60"
            >
              {shiftBusy ? "Guardando…" : "Cerrar turno"}
            </button>
          </div>
        </div>

        {shiftMsg && (
          <div className="rounded-xl bg-zinc-950 p-3 text-sm text-zinc-200 ring-1 ring-zinc-800">
            {shiftMsg}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <h3 className="font-semibold text-zinc-300">Historial de turnos</h3>
            <span>Últimos 20 registros</span>
          </div>
          {shifts.length === 0 && (
            <p className="text-sm text-zinc-400">Sin turnos registrados.</p>
          )}
          {shifts.map((shift) => {
            const difference = shift.differenceCents ?? 0;
            const differenceClass =
              difference > 0
                ? "text-emerald-200"
                : difference < 0
                  ? "text-rose-200"
                  : "text-zinc-200";
            return (
              <div
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-950/60 px-4 py-3 ring-1 ring-zinc-800"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {shift.cashierName}
                    <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                      {shift.status === "open" ? "Abierto" : "Cerrado"}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    Apertura: {formatDate(shift.openedAt)}
                  </p>
                  {shift.closedAt && (
                    <p className="text-xs text-zinc-400">
                      Cierre: {formatDate(shift.closedAt)}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-zinc-200">
                  <div>Caja inicial: {centsToARS(shift.openingCashCents)}</div>
                  {shift.closingCashCents !== undefined && (
                    <div>Caja final: {centsToARS(shift.closingCashCents)}</div>
                  )}
                  {shift.status === "closed" && (
                    <div className={`font-semibold ${differenceClass}`}>
                      Diferencia: {centsToARS(difference)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
              disabled={busy}
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
              disabled={busy}
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

        <label className="grid gap-2 text-sm text-zinc-400">
          Categoría
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="cash-category"
            disabled={busy}
            className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
            placeholder="Proveedor, alquiler, sueldos..."
          />
        </label>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Métodos de pago (split)
            </p>
            <button
              type="button"
              onClick={addSplitMethod}
              disabled={busy}
              className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-zinc-200 ring-1 ring-zinc-800 disabled:opacity-60"
            >
              + Agregar método
            </button>
          </div>

          <div className="grid gap-3">
            {splitMethods.map((entry, index) => (
              <div
                key={entry.id}
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <label className="grid gap-2 text-sm text-zinc-400">
                  Método
                  <select
                    value={entry.method}
                    onChange={(e) =>
                      updateSplitMethod(entry.id, {
                        method: e.target.value as PaymentMethod,
                      })
                    }
                    disabled={busy}
                    className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
                  >
                    {Object.entries(METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-zinc-400">
                  Monto en ARS
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={MAX_AMOUNT_ARS}
                    value={entry.amountARS}
                    onChange={(e) =>
                      updateSplitMethod(entry.id, {
                        amountARS: e.target.value,
                      })
                    }
                    disabled={busy}
                    className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
                    placeholder="Ej: 5000"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeSplitMethod(entry.id)}
                    disabled={busy || !canRemoveSplit}
                    className="rounded-xl bg-zinc-950 px-3 py-2 text-xs text-zinc-200 ring-1 ring-zinc-800 disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>

                {index === splitMethods.length - 1 && (
                  <p className="text-xs text-zinc-500 md:col-span-3">
                    Total actual: {centsToARS(totalAmountCents)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <label className="grid gap-2 text-sm text-zinc-400">
          Nota (opcional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
            placeholder="Detalle breve para el movimiento"
          />
        </label>

        <label className="grid gap-2 text-sm text-zinc-400">
          Fecha del movimiento
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            disabled={busy}
            className="rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 disabled:opacity-60"
          />
        </label>

        <datalist id="cash-category">
          {categorySuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
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

      <div className="grid gap-3 md:grid-cols-2">
        {breakdownByMethod.map((row) => (
          <div
            key={row.method}
            className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              {METHOD_LABELS[row.method]}
            </p>
            <div className="mt-2 grid gap-1 text-sm">
              <p className="text-emerald-200">
                Ingresos: {centsToARS(row.in)}
              </p>
              <p className="text-rose-200">
                Egresos: {centsToARS(row.out)}
              </p>
            </div>
          </div>
        ))}
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
                {m.direction === "in" ? "➕" : "➖"}{" "}
                {toTitleCase(m.category)}
              </p>
              <p className="text-xs text-zinc-400">
                {METHOD_LABELS[m.method]} ·{" "}
                {formatDate(m.occurredAt ?? m.createdAt)}
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
