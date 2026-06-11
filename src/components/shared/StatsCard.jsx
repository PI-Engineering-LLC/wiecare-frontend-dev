import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  variant = 'default',
  className 
}) {
  const variants = {
    default: 'bg-white',
    primary: 'bg-gradient-to-br from-[#005f27] to-[#436a36] text-white',
    success: 'bg-gradient-to-br from-[#005f27] to-[#436a36] text-white',
    warning: 'bg-gradient-to-br from-[#4f7790] to-[#3a5f70] text-white',
    danger: 'bg-gradient-to-br from-[#4f7790] to-[#3a5f70] text-white',
  };

  const isLight = variant === 'default';

  return (
    <Card className={cn(
      "p-4 border-0 shadow-sm hover:shadow-md transition-shadow",
      variants[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className={cn(
            "text-xs font-medium truncate",
            isLight ? "text-slate-500" : "text-white/80"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-xl sm:text-2xl font-bold tracking-tight truncate",
            isLight ? "text-slate-900" : "text-white"
          )}>
            {value}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-xs font-medium",
                trend >= 0 
                  ? (isLight ? "text-emerald-600" : "text-emerald-200")
                  : (isLight ? "text-rose-600" : "text-rose-200")
              )}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              {trendLabel && (
                <span className={cn(
                  "text-xs",
                  isLight ? "text-slate-400" : "text-white/60"
                )}>
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-2 rounded-xl flex-shrink-0",
            isLight ? "bg-slate-100" : "bg-white/20"
          )}>
            <Icon className={cn(
              "h-4 w-4 sm:h-5 sm:w-5",
              isLight ? "text-slate-600" : "text-white"
            )} />
          </div>
        )}
      </div>
    </Card>
  );
}