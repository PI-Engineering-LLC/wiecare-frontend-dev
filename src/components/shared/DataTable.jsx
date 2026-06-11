import React from 'react';
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              {columns.map((col, idx) => (
                <TableHead 
                  key={idx} 
                  className={cn("font-semibold text-slate-700", col.className)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
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