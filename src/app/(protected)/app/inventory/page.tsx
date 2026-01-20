"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/lib/auth/useMe";
import type { Product } from "@/lib/inventory/types";
import { centsToPrice, priceToCents } from "@/lib/inventory/types";
import {
  createProduct,
  defaultProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/lib/inventory/products";

export default function InventoryPage() {
  const { me, loading: meLoading } = useMe();

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(defaultProduct());
  const canUse = useMemo(() => !!me?.shopId, [me?.shopId]);

  async function refresh() {
    if (!me?.shopId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts(me.shopId);
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron cargar productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canUse) refresh();
  }, [canUse]);

  async function onCreate() {
    if (!me?.shopId) return;
    setSaving(true);
    setError(null);
    try {
      if (!form.name.trim()) throw new Error("Nombre requerido");
      await createProduct(me.shopId, {
        ...form,
        salePriceCents: Number(form.salePriceCents) || 0,
        stockQty: Number(form.stockQty) || 0,
        lowStockAlertQty: Number(form.lowStockAlertQty) || 0,
      });
      setForm(defaultProduct());
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo crear producto");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: Product) {
    if (!me?.shopId) return;
    if (!confirm(`Eliminar "${p.name}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProduct(me.shopId, p.id);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  }

  async function onQuickUpdate(p: Product, patch: Partial<Omit<Product, "id">>) {
    if (!me?.shopId) return;
    setSaving(true);
    setError(null);
    try {
      await updateProduct(me.shopId, p.id, patch);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  }

  if (meLoading) {
    return <div className="p-6 text-zinc-200">Cargando sesión…</div>;
  }

  if (!me) {
    return <div className="p-6 text-red-200">No autenticado.</div>;
  }

  if (!me.shopId) {
    return (
      <div className="p-6 text-red-200">
        Tu usuario no tiene shopId. (Esto debería haberse creado en /api/users/ensure)
      </div>
    );
  }

  return (
    <div className="p-6 text-zinc-100">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <p className="text-sm text-zinc-400">
          Shop: <span className="font-mono">{me.shopId}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-950/40 px-3 py-2 text-sm text-red-200 ring-1 ring-red-900/40">
          {error}
        </div>
      )}

      {/* Crear */}
      <div className="mb-6 rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Nuevo producto</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            className="rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800 md:col-span-2"
            placeholder="Nombre (ej: Asado)"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />

          <select
            className="rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
            value={form.unit}
            onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value as any }))}
          >
            <option value="kg">kg</option>
            <option value="unit">unidad</option>
          </select>

          <input
            className="rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
            placeholder="Precio (ej: 5500.00)"
            value={centsToPrice(form.salePriceCents)}
            onChange={(e) => setForm((s) => ({ ...s, salePriceCents: priceToCents(e.target.value) }))}
          />

          <input
            className="rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
            placeholder="Stock"
            type="number"
            step="0.01"
            value={form.stockQty}
            onChange={(e) => setForm((s) => ({ ...s, stockQty: Number(e.target.value) }))}
          />

          <input
            className="rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
            placeholder="Alerta bajo stock"
            type="number"
            step="0.01"
            value={form.lowStockAlertQty}
            onChange={(e) => setForm((s) => ({ ...s, lowStockAlertQty: Number(e.target.value) }))}
          />

          <button
            disabled={saving}
            onClick={onCreate}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-60 md:col-span-5"
          >
            {saving ? "Guardando…" : "Crear producto"}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Productos</h2>
          <button
            disabled={loading}
            onClick={refresh}
            className="rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-60"
          >
            {loading ? "Actualizando…" : "Refrescar"}
          </button>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-zinc-400">No hay productos todavía.</div>
          ) : (
            items.map((p) => {
              const low = p.stockQty <= p.lowStockAlertQty;
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-xl bg-zinc-950/30 p-3 ring-1 ring-zinc-800 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{p.name}</p>
                      {low && (
                        <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-200 ring-1 ring-amber-900/40">
                          Bajo stock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {p.unit} · ${centsToPrice(p.salePriceCents)} · Stock: {p.stockQty}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={saving}
                      onClick={() => onQuickUpdate(p, { stockQty: p.stockQty + 1 })}
                      className="rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-60"
                    >
                      +1 stock
                    </button>

                    <button
                      disabled={saving}
                      onClick={() => onQuickUpdate(p, { stockQty: Math.max(0, p.stockQty - 1) })}
                      className="rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-60"
                    >
                      -1 stock
                    </button>

                    <button
                      disabled={saving}
                      onClick={() => onDelete(p)}
                      className="rounded-xl bg-red-950/30 px-3 py-2 text-xs text-red-200 ring-1 ring-red-900/40 hover:bg-red-950/50 disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
