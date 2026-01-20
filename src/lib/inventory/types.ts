export type ProductUnit = "kg" | "unit";

export type Product = {
  id: string;
  name: string;
  unit: ProductUnit;
  salePriceCents: number; // SIEMPRE centavos
  stockQty: number; // si unit=kg -> kilos (puede ser decimal), si unit=unit -> unidades
  lowStockAlertQty: number;
  createdAt: number;
  updatedAt: number;
};

// helpers UI
export function centsToPrice(cents: number) {
  return (cents / 100).toFixed(2);
}

export function priceToCents(price: string) {
  // "1234.56" -> 123456
  const normalized = price.replace(",", ".").trim();
  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
