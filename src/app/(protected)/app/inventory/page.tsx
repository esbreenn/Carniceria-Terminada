"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/lib/auth/useMe";
import type { Product } from "@/lib/inventory/types";
import { centsToPrice, priceToCents } from "@/lib/inventory/types";
import {
  createProduct,
  defaultProduct,
  listProducts,
  removeProduct,
  updateProduct,
} from "@/lib/inventory/products";

type FormState = {
  id?: string;
  name: string;
  unit: "kg" | "unit";
  salePrice: string; // UI en pesos
  stockQty: string;
  lowStockAlertQty: string;
};

function toForm(p: Product): FormState {
  return {
    id: p.id,
    name: p.name,
    unit: p.unit,
    salePrice: centsToPrice(p.salePriceCents),
    stockQty: String(p.stockQty ?? 0),
    lowStockAlertQty: String(p.lowStockAlertQty ?? 0),
  };
}

function emptyForm(): FormState {
  const d = defaultProduct();
  return {
    name: d.name,
    unit: d.unit,
    salePrice: "0.00",
    stockQty: "0",
    lowStockAlertQty: "0",
  };
}

export default function InventoryPage() {
  const { me, loading: loadingMe } = useMe();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm());
  const editing = !!form.id;

  async function refresh() {
    if (!me?.shopId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await listProducts(me.shopId);
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (me?.shopId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.shopId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.shopId) return;

    setErr(null);
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit,
        salePriceCents: priceToCents(form.salePrice),
        stockQty: Number(form.stockQty),
        lowStockAlertQty: Number(form.lowStockAlertQty),
      };

      if (!payload.name) throw new Error("Nombre requerido");
      if (!Number.isFinite(payload.stockQty)) throw new Error("Stock inválido");
      if (!Number.isFinite(payload.lowStockAlertQty)) throw new Error("Alerta inválida");

      if (editing && form.id) {
        await updateProduct(me.shopId, form.id, payload);
      } else {
        await createProduct(me.shopId, payload as any);
      }

      setForm(emptyForm());
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  }

  function onEdit(p: Product) {
    setErr(null);
    setForm(toForm(p));
  }

  async function onDelete(p: Product) {
    if (!me?.shopId) return;
    const ok = confirm(`Eliminar "${p.name}"?`);
    if (!ok) return;

    setLoading(true);
    setErr(null);
    try {
      await removeProduct(me.shopId, p.id);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo eliminar");
    } finally {
      setLoading(false);
    }
  }

  const lowStockIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of items) {
      if ((p.stockQty ?? 0) <= (p.lowStockAlertQty ?? 0)) s.add(p.id);
    }
    return s;
  }, [items]);

  if (loadingMe) return <div className="p-6 text-zinc-200">Cargando...</div>;
  if (!me) return <div className="p-6 text-zinc-200">No autenticado.</div>;

  return (
    <div className="p-6 text-zinc-100">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <p className="text-sm text-zinc-400">
          Shop: <span className="text-zinc-200">{me.shopId}</span> · Rol:{" "}
          <span className="text-zinc-200">{me.role}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/40 p-5 ring-1 ring-zinc-800">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? "Editar producto" : "Nuevo producto"}
          </h2>

          {err && (
            <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-500/30">
              {err}
            </div>
          )}

          <form onSubmit={onSave} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full rounded-xl bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
                placeholder="Ej: Asado"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Unidad</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value as any }))}
                  className="w-full rounded-xl bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
                >
                  <option value="kg">kg</option>
                  <option value="unit">unidad</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-400">Precio venta ($)</label>
                <input
                  value={form.salePrice}
                  onChange={(e) => setForm((s) => ({ ...s, salePrice: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
                  placeholder="Ej: 6500.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Stock</label>
                <input
                  value={form.stockQty}
                  onChange={(e) => setForm((s) => ({ ...s, stockQty: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
                  placeholder={form.unit === "kg" ? "Ej: 12.5" : "Ej: 30"}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-400">Alerta bajo stock</label>
                <input
                  value={form.lowStockAlertQty}
                  onChange={(e) => setForm((s) => ({ ...s, lowStockAlertQty: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
                  placeholder="Ej: 5"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={loading || me.role !== "owner"}
                className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              >
                {editing ? "Guardar cambios" : "Crear producto"}
              </button>

              <button
                type="button"
                onClick={() => setForm(emptyForm())}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 ring-1 ring-zinc-800"
              >
                Cancelar
              </button>

              {me.role !== "owner" && (
                <span className="ml-auto self-center text-xs text-zinc-400">
                  Solo <b>owner</b> puede escribir (por reglas).
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-2xl bg-zinc-900/40 p-5 ring-1 ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Productos</h2>
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-800 disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Refrescar"}
            </button>
          </div>

          <div className="divide-y divide-zinc-800 overflow-hidden rounded-xl ring-1 ring-zinc-800">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-zinc-400">
                Todavía no hay productos. Creá el primero 👈
              </div>
            ) : (
              items.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{p.name}</p>
                      {lowStockIds.has(p.id) && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200 ring-1 ring-amber-500/30">
                          Bajo stock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {p.unit} · ${centsToPrice(p.salePriceCents)} · stock: {p.stockQty} · alerta:{" "}
                      {p.lowStockAlertQty}
                    </p>
                  </div>

                  <button
                    onClick={() => onEdit(p)}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-800"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => onDelete(p)}
                    disabled={me.role !== "owner"}
                    className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/30 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
