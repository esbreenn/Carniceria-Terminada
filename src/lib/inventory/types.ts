export type ProductUnit = "kg" | "unit";

export type Product = {
  id: string;
  name: string;
  unit: ProductUnit;
  salePriceCents: number; // ENTERO SIEMPRE
  stockQty: number; // puede ser decimal si unit=kg
  lowStockAlertQty: number;
  createdAt?: number;
  updatedAt?: number;
};

// "6500.00" -> 650000
export function priceToCents(price: string): number {
  const normalized = price.replace(",", ".").trim();
  if (!normalized) return 0;

  const num = Number(normalized);
  if (!Number.isFinite(num)) throw new Error("Precio inválido");

  return Math.round(num * 100);
}

// 650000 -> "6500.00"
export function centsToPrice(cents: number): string {
  const n = Number(cents || 0);
  return (n / 100).toFixed(2);
}
