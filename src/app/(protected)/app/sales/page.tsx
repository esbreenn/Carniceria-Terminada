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
    <div className="p-6 text-zinc-100">
      <h1 className="text-xl font-semibold">Ventas</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Venta (operación) ≠ Caja (liquidez). Acá registramos la venta y también generamos el ingreso en caja.
      </p>

      <div className="mt-6 grid gap-4 rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Producto</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {centsToARS(p.salePriceCents)} / kg — stock {p.stockQty} kg
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Modo</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("kg")}
              className={`rounded-xl px-3 py-2 ring-1 ring-zinc-800 ${
                mode === "kg" ? "bg-zinc-100 text-zinc-950" : "bg-zinc-950"
              }`}
            >
              Por kg
            </button>
            <button
              onClick={() => setMode("amount")}
              className={`rounded-xl px-3 py-2 ring-1 ring-zinc-800 ${
                mode === "amount" ? "bg-zinc-100 text-zinc-950" : "bg-zinc-950"
              }`}
            >
              Por $
            </button>
          </div>
        </div>

        {mode === "kg" ? (
          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Cantidad (kg)</label>
            <input
              value={qtyKg}
              onChange={(e) => setQtyKg(e.target.value)}
              className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
              placeholder="Ej: 1.25"
            />
          </div>
        ) : (
          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Importe ($ ARS)</label>
            <input
              value={amountARS}
              onChange={(e) => setAmountARS(e.target.value)}
              className="rounded-xl bg-zinc-950 px-3 py-2 ring-1 ring-zinc-800"
              placeholder="Ej: 5000"
            />
          </div>
        )}

        <div className="grid gap-2">
          <label className="text-sm text-zinc-300">Medio de pago</label>
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

        <div className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
          <p className="text-sm text-zinc-300">Previsualización</p>
          <p className="mt-1 text-sm text-zinc-400">
            {preview
              ? `Cantidad: ${preview.qtyKg} kg — Total: ${centsToARS(preview.totalCents)}`
              : "Completa los datos"}
          </p>
        </div>

        {msg && (
          <div className="rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800 text-sm">
            {msg}
          </div>
        )}

        <button
          disabled={busy || !preview}
          onClick={handleCreateSale}
          className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
        >
          {busy ? "Registrando…" : "Confirmar venta"}
        </button>
      </div>
    </div>
  );
}
