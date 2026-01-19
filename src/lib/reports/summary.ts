export type SummaryMap = Record<string, number>;

export type DailySummary = {
  day?: string;
  salesCount?: number;
  salesTotalCents?: number;
  byMethod?: SummaryMap; // legacy
  salesByMethod?: SummaryMap;

  cashNetCents?: number; // firmado
  cashInCents?: number;
  cashOutCents?: number;

  cashByMethod?: SummaryMap; // legacy firmado
  cashInByMethod?: SummaryMap;
  cashOutByMethod?: SummaryMap;
};

export type MonthlySummary = {
  month?: string;
} & DailySummary;

export function pickSalesByMethod(s: DailySummary | MonthlySummary | null): SummaryMap {
  if (!s) return {};
  return (s.salesByMethod || s.byMethod || {}) as SummaryMap;
}
