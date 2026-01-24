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
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<"all" | Product["unit"]>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<Product, "id" | "createdAt" | "updatedAt">>(
    defaultProduct()
  );
  const [adjustQty, setAdjustQty] = useState(1);
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

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      unit: p.unit,
      salePriceCents: p.salePriceCents,
      stockQty: p.stockQty,
      lowStockAlertQty: p.lowStockAlertQty,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(defaultProduct());
  }

  async function onSaveEdit(p: Product) {
    await onQuickUpdate(p, {
      name: editForm.name,
      unit: editForm.unit,
      salePriceCents: editForm.salePriceCents,
      stockQty: editForm.stockQty,
      lowStockAlertQty: editForm.lowStockAlertQty,
    });
    setEditingId(null);
  }

  const stats = useMemo(() => {
    const lowStock = items.filter((p) => p.stockQty <= p.lowStockAlertQty);
    return {
      total: items.length,
      lowStock: lowStock.length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((p) => {
      const matchesQuery =
        !normalizedQuery || p.name.toLowerCase().includes(normalizedQuery);
      const matchesUnit = unitFilter === "all" || p.unit === unitFilter;
      const isLowStock = p.stockQty <= p.lowStockAlertQty;
      const matchesLowStock = !showLowStockOnly || isLowStock;
      return matchesQuery && matchesUnit && matchesLowStock;
    });
  }, [items, query, unitFilter, showLowStockOnly]);

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

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
          <p className="text-xs uppercase text-zinc-400">Productos</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
          <p className="text-xs uppercase text-zinc-400">Bajo stock</p>
          <p className="text-2xl font-semibold text-amber-200">{stats.lowStock}</p>
        </div>
        <div className="rounded-2xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800">
          <p className="text-xs uppercase text-zinc-400">Acciones</p>
          <button
            disabled={loading}
            onClick={refresh}
            className="mt-2 rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-60"
          >
            {loading ? "Actualizando…" : "Refrescar"}
          </button>
        </div>
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
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Productos</h2>
            <p className="text-xs text-zinc-400">Busca, filtra y ajusta el stock rápido.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              className="rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
              placeholder="Buscar por nombre"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="rounded-xl bg-zinc-950/40 px-3 py-2 text-sm ring-1 ring-zinc-800"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as "all" | Product["unit"])}
            >
              <option value="all">Todas las unidades</option>
              <option value="kg">kg</option>
              <option value="unit">unidad</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
              />
              Solo bajo stock
            </label>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-zinc-400">No hay productos todavía.</div>
          ) : (
            filtered.map((p) => {
              const low = p.stockQty <= p.lowStockAlertQty;
              const isEditing = editingId === p.id;
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
                    {isEditing && (
                      <div className="mt-3 grid gap-2 text-sm md:grid-cols-5">
                        <input
                          className="rounded-xl bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800 md:col-span-2"
                          value={editForm.name}
                          onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                        />
                        <select
                          className="rounded-xl bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800"
                          value={editForm.unit}
                          onChange={(e) =>
                            setEditForm((s) => ({ ...s, unit: e.target.value as Product["unit"] }))
                          }
                        >
                          <option value="kg">kg</option>
                          <option value="unit">unidad</option>
                        </select>
                        <input
                          className="rounded-xl bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800"
                          value={centsToPrice(editForm.salePriceCents)}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              salePriceCents: priceToCents(e.target.value),
                            }))
                          }
                        />
                        <input
                          className="rounded-xl bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800"
                          type="number"
                          step="0.01"
                          value={editForm.stockQty}
                          onChange={(e) =>
                            setEditForm((s) => ({ ...s, stockQty: Number(e.target.value) }))
                          }
                        />
                        <input
                          className="rounded-xl bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800"
                          type="number"
                          step="0.01"
                          value={editForm.lowStockAlertQty}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              lowStockAlertQty: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={saving}
                      onClick={() => onQuickUpdate(p, { stockQty: p.stockQty + adjustQty })}
                      className="rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-60"
                    >
                      +{adjustQty} stock
                    </button>

                    <button
                      disabled={saving}
                      onClick={() =>
                        onQuickUpdate(p, {
                          stockQty: Math.max(0, p.stockQty - adjustQty),
                        })
                      }
                      className="rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-60"
                    >
                      -{adjustQty} stock
                    </button>

                    <input
                      className="w-20 rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800"
                      type="number"
                      min={1}
                      step="1"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                    />

                    {isEditing ? (
                      <>
                        <button
                          disabled={saving}
                          onClick={() => onSaveEdit(p)}
                          className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-60"
                        >
                          Guardar
                        </button>
                        <button
                          disabled={saving}
                          onClick={cancelEdit}
                          className="rounded-xl bg-zinc-950/40 px-3 py-2 text-xs ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={saving}
                        onClick={() => startEdit(p)}
                        className="rounded-xl bg-sky-500/20 px-3 py-2 text-xs text-sky-100 ring-1 ring-sky-500/40 hover:bg-sky-500/30 disabled:opacity-60"
                      >
                        Editar
                      </button>
                    )}

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
