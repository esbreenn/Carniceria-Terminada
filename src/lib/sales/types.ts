export type PaymentMethod = "cash" | "transfer" | "debit" | "credit" | "mp";

export type SaleItemInput =
  | { productId: string; mode: "kg"; qtyKg: number }
  | { productId: string; mode: "amount"; amountCents: number };

export type CreateSaleInput = {
  item: SaleItemInput; // MVP: 1 producto por venta
  paymentMethod: PaymentMethod;
};

export type SaleDoc = {
  id?: string;
  createdAt: number;
  createdBy: string; // uid
  shopId: string;
  paymentMethod: PaymentMethod;

  productId: string;
  productName: string;

  qtyKg: number; // cantidad final en kg (puede ser decimal)
  pricePerKgCents: number;

  totalCents: number;
};
