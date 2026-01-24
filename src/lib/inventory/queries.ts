import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import type { Product } from "@/lib/inventory/types";

export async function listLowStockProducts(shopId: string): Promise<Product[]> {
  const col = collection(firebaseDb, `shops/${shopId}/products`);
  const q = query(col, orderBy("stockQty", "asc"), orderBy("name", "asc"));
  const snap = await getDocs(q);

  const all = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));

  return all
    .map((p): Product => {
      const unit: Product["unit"] =
        p.unit === "unit" || p.unit === "kg" ? p.unit : "unit";

      return {
        id: String(p.id),
        name: String(p.name ?? ""),
        unit,
        salePriceCents: Number(p.salePriceCents ?? 0),
        stockQty: Number(p.stockQty ?? 0),
        lowStockAlertQty: Number(p.lowStockAlertQty ?? 0),
        createdAt: Number(p.createdAt ?? Date.now()),
        updatedAt: Number(p.updatedAt ?? Date.now()),
      };
    })
    .filter((p) => p.stockQty <= p.lowStockAlertQty);
}
