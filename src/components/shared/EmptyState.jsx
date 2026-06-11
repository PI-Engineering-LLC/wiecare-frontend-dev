import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel,
  className 
}) {
  return (
    <Card className={cn("p-12 text-center border-0 shadow-sm", className)}>
      {Icon && (
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} className="bg-[#1e3a5f] hover:bg-[#2d5a8a]">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}