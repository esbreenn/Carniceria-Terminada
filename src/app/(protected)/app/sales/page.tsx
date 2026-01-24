"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useMe } from "@/lib/auth/useMe";
import { createSale } from "@/lib/sales/client";
import type { PaymentMethod } from "@/lib/sales/types";

type Product = {
  id: string;
  name: string;
  unit: "kg" | "unit";
  salePriceCents: number;
  costPerKgCents?: number;
  stockQty: number;
};

type SaleSummary = {
  id: string;
  productId: string;
  productName: string;
  qtyKg: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  createdAt: number;
};

function centsToARS(cents: number) {
  const v = cents / 100;
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKg(value: number) {
  return `${value.toFixed(3).replace(/\.?0+$/, "")} kg`;
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  debit: "Débito",
  credit: "Crédito",
  mp: "Mercado Pago",
};

export default function SalesPage() {
  const { me, loading } = useMe();

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"kg" | "amount">("kg");
  const [qtyKg, setQtyKg] = useState("1");
  const [amountARS, setAmountARS] = useState("5000");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [recentSales, setRecentSales] = useState<SaleSummary[]>([]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const qtyInputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId]
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, search]);

  useEffect(() => {
    (async () => {
      if (!me?.shopId) return;
      const q = query(
        collection(firebaseDb, `shops/${me.shopId}/products`),
        orderBy("name", "asc")
      );
      const snap = await getDocs(q);
      const list: Product[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setProducts(list);
      if (!productId && list.length) setProductId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.shopId]);

  useEffect(() => {
    (async () => {
      if (!me?.shopId) return;
      const q = query(
        collection(firebaseDb, `shops/${me.shopId}/sales`),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      const list: SaleSummary[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as SaleSummary),
      }));
      setRecentSales(list);
    })();
  }, [me?.shopId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      qtyInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timeout);
  }, [mode, productId]);

  function amountToCents(input: string) {
    // "5000" -> 5000 ARS -> 500000 cents
    const ars = Number(input);
    if (!Number.isFinite(ars)) return 0;
    return Math.round(ars * 100);
  }

  const qtyError = useMemo(() => {
    if (mode === "amount") return null;
    if (!qtyKg.trim()) return "Ingresá una cantidad en kg.";
    const q = Number(qtyKg);
    if (!Number.isFinite(q)) return "Ingresá un número válido.";
    if (q <= 0) return "La cantidad debe ser mayor a 0.";
    return null;
  }, [mode, qtyKg]);

  const amountError = useMemo(() => {
    if (mode === "kg") return null;
    if (!amountARS.trim()) return "Ingresá un importe en pesos.";
    const ars = Number(amountARS);
    if (!Number.isFinite(ars)) return "Ingresá un número válido.";
    if (ars <= 0) return "El importe debe ser mayor a 0.";
    return null;
  }, [amountARS, mode]);

  const preview = useMemo(() => {
    if (!selected) return null;

    const pricePerKgCents = selected.salePriceCents;

    if (mode === "kg") {
      const q = Number(qtyKg);
      if (!Number.isFinite(q) || q <= 0) return null;
      const totalCents = Math.round(q * pricePerKgCents);
      return { qtyKg: q, totalCents, pricePerKgCents };
    } else {
      const totalCents = amountToCents(amountARS);
      if (!Number.isInteger(totalCents) || totalCents <= 0) return null;
      const q = Number((totalCents / pricePerKgCents).toFixed(3));
      return { qtyKg: q, totalCents, pricePerKgCents };
    }
  }, [selected, mode, qtyKg, amountARS]);

  const exceedsStock = useMemo(() => {
    if (!selected || !preview) return false;
    return preview.qtyKg > selected.stockQty;
  }, [preview, selected]);

  const stockAfter = useMemo(() => {
    if (!selected || !preview) return null;
    return Number((selected.stockQty - preview.qtyKg).toFixed(3));
  }, [preview, selected]);

  const marginInfo = useMemo(() => {
    if (!selected?.costPerKgCents || !preview) return null;
    const perKgCents = selected.salePriceCents - selected.costPerKgCents;
    const totalCents = Math.round(preview.qtyKg * perKgCents);
    return { perKgCents, totalCents };
  }, [preview, selected]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      if (busy || !preview || exceedsStock) return;
      handleCreateSale();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [busy, exceedsStock, handleCreateSale, preview]);

  async function handleCreateSale() {
    setMsg(null);

    if (!me) {
      setMsg("No autenticado");
      return;
    }
    if (!selected) {
      setMsg("Elegí un producto");
      return;
    }
    if (!preview) {
      setMsg("Datos inválidos");
      return;
    }

    setBusy(true);
    try {
      if (mode === "kg") {
        await createSale({
          paymentMethod: method,
          item: { productId: selected.id, mode: "kg", qtyKg: preview.qtyKg },
        });
      } else {
        await createSale({
          paymentMethod: method,
          item: {
            productId: selected.id,
            mode: "amount",
            amountCents: preview.totalCents,
          },
        });
      }

      setMsg("✅ Venta registrada");

      // refrescar stock en pantalla
      const updated = products.map((p) => {
        if (p.id !== selected.id) return p;
        return { ...p, stockQty: Number((p.stockQty - preview.qtyKg).toFixed(3)) };
      });
      setProducts(updated);
      setRecentSales((prev) => {
        const newSale: SaleSummary = {
          id: `local-${Date.now()}`,
          productId: selected.id,
          productName: selected.name,
          qtyKg: preview.qtyKg,
          totalCents: preview.totalCents,
          paymentMethod: method,
          createdAt: Date.now(),
        };
        return [newSale, ...prev].slice(0, 5);
      });
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Error"}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-zinc-200">Cargando…</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Panel de ventas</p>
              <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Ventas</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Venta (operación) ≠ Caja (liquidez). Acá registramos la venta y también generamos el ingreso en caja.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-3">
              <div>
                <p className="text-xs text-zinc-400">Producto activo</p>
                <p className="text-sm font-medium text-white">{selected?.name || "Seleccioná un producto"}</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-xs text-zinc-400">Precio base</p>
                <p className="text-sm font-medium text-white">
                  {selected ? `${centsToARS(selected.salePriceCents)} / kg` : "—"}
                </p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-xs text-zinc-400">Stock</p>
                <p className="text-sm font-medium text-white">
                  {selected ? formatKg(selected.stockQty) : "—"}
                </p>
                {selected && selected.stockQty <= 2 ? (
                  <p className="mt-1 text-xs text-amber-300">Stock bajo</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-lg shadow-black/30">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Producto</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  placeholder="Buscar producto..."
                />
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {centsToARS(p.salePriceCents)} / kg — stock {formatKg(p.stockQty)}
                    </option>
                  ))}
                </select>
                {!filteredProducts.length && (
                  <p className="text-xs text-amber-300">No hay productos que coincidan con la búsqueda.</p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Modo</label>
                <div className="inline-flex rounded-2xl border border-white/10 bg-zinc-950 p-1">
                  <button
                    onClick={() => setMode("kg")}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      mode === "kg"
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Por kg
                  </button>
                  <button
                    onClick={() => setMode("amount")}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      mode === "amount"
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Por $
                  </button>
                </div>
              </div>

              {mode === "kg" ? (
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Cantidad (kg)</label>
                  <input
                    ref={qtyInputRef}
                    value={qtyKg}
                    onChange={(e) => setQtyKg(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                    placeholder="Ej: 1.25"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[0.5, 1, 1.5].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQtyKg(String(q))}
                        className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs text-zinc-200 transition hover:border-emerald-400/60 hover:text-white"
                      >
                        {q} kg
                      </button>
                    ))}
                  </div>
                  {qtyError && <p className="text-xs text-amber-300">{qtyError}</p>}
                </div>
              ) : (
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Importe ($ ARS)</label>
                  <input
                    ref={qtyInputRef}
                    value={amountARS}
                    onChange={(e) => setAmountARS(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                    placeholder="Ej: 5000"
                  />
                  {amountError && <p className="text-xs text-amber-300">{amountError}</p>}
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Medio de pago</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                  {(Object.keys(paymentLabels) as PaymentMethod[]).map((key) => (
                    <option key={key} value={key}>
                      {paymentLabels[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-lg shadow-black/30">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Previsualización</p>
              <p className="mt-2 text-sm text-zinc-200">
                {preview
                  ? `Cantidad: ${formatKg(preview.qtyKg)} — Total: ${centsToARS(preview.totalCents)}`
                  : "Completa los datos"}
              </p>
              {preview ? (
                <div className="mt-3 grid gap-1 text-xs text-zinc-400">
                  <p>Precio por kg: {centsToARS(preview.pricePerKgCents)}</p>
                  {stockAfter !== null && (
                    <p>
                      Stock luego de la venta:{" "}
                      <span className={exceedsStock ? "text-red-300" : "text-zinc-200"}>
                        {formatKg(stockAfter)}
                      </span>
                    </p>
                  )}
                  {marginInfo && (
                    <p className={marginInfo.perKgCents >= 0 ? "text-emerald-300" : "text-red-300"}>
                      Margen estimado: {centsToARS(marginInfo.totalCents)} (
                      {centsToARS(marginInfo.perKgCents)} / kg)
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {exceedsStock && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
                La cantidad supera el stock disponible. Ajustá el peso o el importe.
              </div>
            )}

            {msg && (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-100">
                {msg}
              </div>
            )}

            <button
              disabled={busy || !preview || exceedsStock}
              onClick={handleCreateSale}
              className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {busy ? "Registrando…" : "Confirmar venta"}
            </button>
            <p className="text-xs text-zinc-500">Atajo: Enter para confirmar.</p>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-xs text-zinc-400">
              <p className="font-semibold uppercase tracking-widest text-zinc-500">Tip</p>
              <p className="mt-2">
                Registrá la venta antes de cerrar caja para mantener el stock y la liquidez sincronizados.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Ventas recientes
              </p>
              {recentSales.length ? (
                <div className="mt-3 grid gap-3 text-xs text-zinc-200">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="rounded-xl border border-white/5 bg-zinc-900/60 p-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{formatTime(sale.createdAt)}</span>
                        <span>{paymentLabels[sale.paymentMethod]}</span>
                      </div>
                      <p className="mt-2 text-sm text-white">{sale.productName}</p>
                      <p className="mt-1 text-xs text-zinc-300">
                        {formatKg(sale.qtyKg)} · {centsToARS(sale.totalCents)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setProductId(sale.productId);
                          setMode("amount");
                          setAmountARS(String(sale.totalCents / 100));
                          setSearch("");
                          setMsg(null);
                        }}
                        className="mt-2 rounded-full border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100"
                      >
                        Repetir monto
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">Todavía no hay ventas recientes.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
