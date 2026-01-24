"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useMe } from "@/lib/auth/useMe";
import { createSale } from "@/lib/sales/client";
import type { PaymentMethod } from "@/lib/sales/types";

type Product = {
  id: string;
  name: string;
  unit: "kg" | "unit";
  salePriceCents: number;
  stockQty: number;
};

function centsToARS(cents: number) {
  const v = cents / 100;
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function SalesPage() {
  const { me, loading } = useMe();

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [mode, setMode] = useState<"kg" | "amount">("kg");
  const [qtyKg, setQtyKg] = useState("1");
  const [amountARS, setAmountARS] = useState("5000");
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId]
  );

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

  function amountToCents(input: string) {
    // "5000" -> 5000 ARS -> 500000 cents
    const ars = Number(input);
    if (!Number.isFinite(ars)) return 0;
    return Math.round(ars * 100);
  }

  const preview = useMemo(() => {
    if (!selected) return null;

    const pricePerKgCents = selected.salePriceCents;

    if (mode === "kg") {
      const q = Number(qtyKg);
      if (!Number.isFinite(q) || q <= 0) return null;
      const totalCents = Math.round(q * pricePerKgCents);
      return { qtyKg: q, totalCents };
    } else {
      const totalCents = amountToCents(amountARS);
      if (!Number.isInteger(totalCents) || totalCents <= 0) return null;
      const q = Number((totalCents / pricePerKgCents).toFixed(3));
      return { qtyKg: q, totalCents };
    }
  }, [selected, mode, qtyKg, amountARS]);

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
                  {selected ? `${selected.stockQty} kg` : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-lg shadow-black/30">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Producto</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {centsToARS(p.salePriceCents)} / kg — stock {p.stockQty} kg
                    </option>
                  ))}
                </select>
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
                    value={qtyKg}
                    onChange={(e) => setQtyKg(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                    placeholder="Ej: 1.25"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Importe ($ ARS)</label>
                  <input
                    value={amountARS}
                    onChange={(e) => setAmountARS(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                    placeholder="Ej: 5000"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Medio de pago</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                  <option value="cash">cash</option>
                  <option value="transfer">transfer</option>
                  <option value="debit">debit</option>
                  <option value="credit">credit</option>
                  <option value="mp">mp</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-900/40 p-6 shadow-lg shadow-black/30">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Previsualización</p>
              <p className="mt-2 text-sm text-zinc-200">
                {preview
                  ? `Cantidad: ${preview.qtyKg} kg — Total: ${centsToARS(preview.totalCents)}`
                  : "Completa los datos"}
              </p>
            </div>

            {msg && (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-100">
                {msg}
              </div>
            )}

            <button
              disabled={busy || !preview}
              onClick={handleCreateSale}
              className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {busy ? "Registrando…" : "Confirmar venta"}
            </button>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-xs text-zinc-400">
              <p className="font-semibold uppercase tracking-widest text-zinc-500">Tip</p>
              <p className="mt-2">
                Registrá la venta antes de cerrar caja para mantener el stock y la liquidez sincronizados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
