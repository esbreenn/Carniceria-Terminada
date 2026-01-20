// Métodos de pago permitidos
export type PaymentMethod =
  | "cash"
  | "transfer"
  | "debit"
  | "credit"
  | "mp";

// Dirección del movimiento
export type CashDirection = "in" | "out";

// Input para crear un movimiento de caja
export type CreateCashInput = {
  direction: CashDirection;
  method: PaymentMethod;
  category: string;      // proveedor, alquiler, sueldos, etc
  amountCents: number;   // siempre int, en centavos
  note?: string;
};

// Movimiento completo guardado en Firestore
export type CashMovement = {
  id: string;
  direction: CashDirection;
  method: PaymentMethod;
  category: string;
  amountCents: number;
  note?: string;
  createdAt: number;     // Date.now()
  createdBy: string;     // uid del usuario
};
