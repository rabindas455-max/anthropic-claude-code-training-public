import { merchantById } from "@/data/merchants"
import { Payment, PaymentStatus } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table. Ops picks the columns and the scope
 * (NWP-101); this file owns the column allowlist, the per-cell formatting,
 * and the filename — the route handler never touches any of it directly.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** Card last-four is opt-in: it's what used to make every export need a manual scrub before it could go to a merchant. */
export const DEFAULT_EXPORT_COLUMNS: readonly ExportColumn[] =
  EXPORT_COLUMNS.filter((column) => column !== "last4")

const EXPORT_COLUMN_SET: ReadonlySet<string> = new Set(EXPORT_COLUMNS)

/**
 * Columns arrive from the client as a query param, so they're validated
 * against the allowlist here rather than trusted by the route handler.
 *
 * - No `columns` param at all -> the safe default set (no last4).
 * - An explicit empty selection ("") -> no columns, so the caller can tell
 *   "nothing requested" apart from "nothing specified" and refuse the export
 *   instead of silently falling back to the defaults.
 * - Anything not on the allowlist is dropped rather than rejected outright.
 */
export function parseExportColumns(raw: string | null): ExportColumn[] {
  if (raw === null) return [...DEFAULT_EXPORT_COLUMNS]
  return raw
    .split(",")
    .map((column) => column.trim())
    .filter((column): column is ExportColumn => EXPORT_COLUMN_SET.has(column))
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

export function exportFilename(
  scope: "all" | "filtered",
  status: PaymentStatus | "all" | undefined,
  date = new Date(),
): string {
  const stamp = date.toISOString().slice(0, 10)
  if (scope === "all") return `payments-all-${stamp}.csv`
  if (status && status !== "all") return `payments-${status}-${stamp}.csv`
  return `payments-${stamp}.csv`
}
