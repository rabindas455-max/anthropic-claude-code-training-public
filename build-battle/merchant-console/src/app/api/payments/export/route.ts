import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { exportFilename, parseExportColumns, toCsv } from "@/lib/csv"
import { NextRequest } from "next/server"

/**
 * Exports the payments table as CSV.
 *
 * `scope` picks between the active filters and every payment; either way,
 * filtering and sorting still go through the one query builder, just without
 * `paginate` so the file isn't capped to a single page. `columns` is
 * validated against the allowlist in csv.ts before it ever reaches `toCsv`.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filters = parseFilters(params)
  const scope = params.get("scope") === "all" ? "all" : "filtered"
  const columns = parseExportColumns(params.get("columns"))

  if (columns.length === 0) {
    return new Response("Select at least one column to export.", {
      status: 400,
    })
  }

  const effectiveFilters =
    scope === "all"
      ? { sort: filters.sort, direction: filters.direction }
      : filters
  const rows = sortPayments(
    filterPayments(effectiveFilters),
    effectiveFilters.sort,
    effectiveFilters.direction,
  )

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(scope, filters.status)}"`,
    },
  })
}
