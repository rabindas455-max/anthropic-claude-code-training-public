"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import { DEFAULT_EXPORT_COLUMNS, EXPORT_COLUMNS, ExportColumn } from "@/lib/csv"
import { Download } from "lucide-react"
import { useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Date",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

export function ExportDialog({
  query,
  filteredTotal,
  allTotal,
}: {
  query: string
  filteredTotal: number
  allTotal: number
}) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<"filtered" | "all">("filtered")
  const [columns, setColumns] = useState<ExportColumn[]>([
    ...DEFAULT_EXPORT_COLUMNS,
  ])

  const toggleColumn = (column: ExportColumn) => {
    setColumns((current) =>
      current.includes(column)
        ? current.filter((c) => c !== column)
        : [...current, column],
    )
  }

  const count = scope === "filtered" ? filteredTotal : allTotal
  const canDownload = columns.length > 0

  const href = () => {
    const params = new URLSearchParams(scope === "filtered" ? query : "")
    params.set("scope", scope)
    params.set("columns", columns.join(","))
    return `/api/payments/export?${params.toString()}`
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="export-scope"
                checked={scope === "filtered"}
                onChange={() => setScope("filtered")}
              />
              Current filter ({filteredTotal.toLocaleString()} payments)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="export-scope"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              All payments ({allTotal.toLocaleString()} payments)
            </label>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            {EXPORT_COLUMNS.map((column) => (
              <label
                key={column}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={columns.includes(column)}
                  onChange={() => toggleColumn(column)}
                />
                {COLUMN_LABELS[column]}
              </label>
            ))}
          </fieldset>
        </DrawerBody>
        <DrawerFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-sm text-gray-500">
            {canDownload
              ? `${count.toLocaleString()} payments will be exported`
              : "Select at least one column"}
          </p>
          <Button variant="primary" asChild={canDownload} disabled={!canDownload}>
            {canDownload ? (
              <a href={href()} onClick={() => setOpen(false)}>
                Download
              </a>
            ) : (
              <span>Download</span>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
