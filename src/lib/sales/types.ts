export type PaymentMethod = "cash" | "transfer" | "debit" | "credit" | "mp";

export type SaleItemInput =
  | { productId: string; mode: "kg"; qtyKg: number }
  | { productId: string; mode: "amount"; amountCents: number };

export type CreateSaleInput = {
  items: SaleItemInput[];
  paymentMethod: PaymentMethod;
};

export type SaleItemDoc = {
  productId: string;
  productName: string;
  qtyKg: number;
  pricePerKgCents: number;
  totalCents: number;
};

export type SaleDoc = {
  id?: string;
  createdAt: number;
  createdBy: string; // uid
  shopId: string;
  paymentMethod: PaymentMethod;

  productId?: string;
  productName?: string;

  qtyKg?: number; // cantidad final en kg (puede ser decimal)
  pricePerKgCents?: number;
  items?: SaleItemDoc[];

  totalCents: number;
};
