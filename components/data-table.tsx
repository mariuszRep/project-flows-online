'use client'

import { useState, ReactNode, useMemo, memo } from 'react'
import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  // Header with title and action button
  title?: string
  description?: string
  action?: ReactNode
  // Loading state
  loading?: boolean
  // Row selection
  enableRowSelection?: boolean
  onRowSelectionChange?: (selectedRows: TData[]) => void
  // Empty state
  emptyStateMessage?: string
  // Pagination control
  enablePagination?: boolean
  // Column visibility control
  enableColumnVisibility?: boolean
  // Initial page size
  pageSize?: number
  // Bulk actions (rendered in toolbar when rows are selected)
  bulkActions?: ReactNode
}

function DataTableComponent<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  title,
  description,
  action,
  loading = false,
  enableRowSelection = false,
  onRowSelectionChange,
  emptyStateMessage = 'No results.',
  enablePagination = true,
  enableColumnVisibility = true,
  pageSize = 10,
  bulkActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  // Memoize table configuration to prevent unnecessary re-renders
  const tableConfig = useMemo(
    () => ({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      onColumnFiltersChange: setColumnFilters,
      getFilteredRowModel: getFilteredRowModel(),
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      enableRowSelection: enableRowSelection,
      initialState: {
        pagination: {
          pageSize,
        },
      },
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
      },
    }),
    [
      data,
      columns,
      enablePagination,
      enableRowSelection,
      pageSize,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    ]
  )

  const table = useReactTable(tableConfig)

  // Notify parent of row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange && enableRowSelection) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, onRowSelectionChange, enableRowSelection, table])

  return (
    <div className="space-y-4">
      {/* Header with title and description */}
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Toolbar - Search, Add Button, Bulk Actions, and Columns - ALL IN ONE LINE */}
      {(searchKey || bulkActions || action || enableColumnVisibility) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            {searchKey && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                  onChange={(event) =>
                    table.getColumn(searchKey)?.setFilterValue(event.target.value)
                  }
                  className="pl-9"
                  aria-label={searchPlaceholder}
                />
              </div>
            )}
            {action}
            {bulkActions}
          </div>
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    const header = column.columnDef.header
                    const label = typeof header === 'string' ? header : column.id

                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {enableRowSelection ? (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            ) : (
              <>
                Showing {table.getRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s).
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Export memoized component for performance optimization
export const DataTable = memo(DataTableComponent) as typeof DataTableComponent
