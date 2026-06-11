import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  // General statuses
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  
  // Quote statuses
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
  converted: 'bg-violet-50 text-violet-700 border-violet-200',
  
  // Order statuses
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
  
  // Invoice statuses
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  
  // Maintenance statuses
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  
  // Training statuses
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  registered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  attended: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  no_show: 'bg-rose-50 text-rose-700 border-rose-200',
  
  // Course statuses
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-200',
  not_started: 'bg-slate-100 text-slate-600 border-slate-200',
  
  // Warranty statuses
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  
  // Priority
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function StatusBadge({ status, className }) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_');
  const style = statusStyles[normalizedStatus] || 'bg-slate-100 text-slate-600 border-slate-200';
  
  const displayStatus = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Badge 
      variant="outline" 
      className={cn(style, "font-medium capitalize", className)}
    >
      {displayStatus}
    </Badge>
  );
}