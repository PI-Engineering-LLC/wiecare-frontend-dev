import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DataTable({
  columns,
  data,
  isLoading,
  emptyMessage = "No data found",
  onRowClick,
  className
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);
  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden border-0 shadow-sm", className)}>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              {columns.map((col, idx) => (
                <TableHead key={idx} className="font-semibold text-slate-700">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn("p-12 text-center border-0 shadow-sm", className)}>
        <p className="text-slate-500">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden border-0 shadow-sm", className)}>
      {/* Mobile: stacked cards, no horizontal scroll needed */}
      <div className="md:hidden divide-y divide-slate-100">
        {data.map((row, i) => (
          <div
            key={row.id || i}
            onClick={() => onRowClick?.(row)}
            className={cn("p-4 space-y-2", onRowClick && "cursor-pointer hover:bg-slate-50")}
          >
            {columns.map((col, j) => (
              <div key={j} className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500 flex-shrink-0 pt-0.5">{col.header}</span>
                <div className="text-right min-w-0">
                  {col.render ? col.render(row) : row[col.accessor]}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn("font-semibold text-slate-700", col.className, col.sortKey && "cursor-pointer hover:bg-slate-100")}
                  onClick={() => col.sortKey && handleSort(col.sortKey)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortKey && (
                      sortConfig.key === col.sortKey
                        ? (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, i) => (
              <TableRow
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50"
                )}
              >
                {columns.map((col, j) => (
                  <TableCell key={j} className={col.cellClassName}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}