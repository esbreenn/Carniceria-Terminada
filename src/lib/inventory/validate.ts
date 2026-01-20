import type { Product } from "@/lib/inventory/types";

export function assertValidProductInput(p: {
  name: string;
  unit: "kg" | "unit";
  salePriceCents: number;
  stockQty: number;
  lowStockAlertQty: number;
}) {
  if (!p.name?.trim()) throw new Error("Nombre requerido");

  if (p.salePriceCents < 0) throw new Error("Precio inválido");
  if (!Number.isInteger(p.salePriceCents))
    throw new Error("salePriceCents debe ser int (centavos)");

  if (!Number.isFinite(p.stockQty)) throw new Error("Stock inválido");
  if (p.stockQty < 0) throw new Error("Stock no puede ser negativo");

  if (!Number.isFinite(p.lowStockAlertQty))
    throw new Error("Alerta inválida");
  if (p.lowStockAlertQty < 0)
    throw new Error("Alerta no puede ser negativa");

  if (p.unit !== "kg" && p.unit !== "unit") throw new Error("Unidad inválida");
}
