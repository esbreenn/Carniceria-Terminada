export type PaymentMethod = "cash" | "transfer" | "debit" | "credit" | "mp";

export type CashDirection = "in" | "out";

export type CreateCashInput = {
  direction: CashDirection;
  method: PaymentMethod;
  category: string; // proveedor, alquiler, sueldos...
  amountCents: number; // int
  note?: string;
};
