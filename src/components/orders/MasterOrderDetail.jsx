import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from '@/components/shared/StatusBadge';
import SubOrderPanel from './SubOrderPanel';
import { ShoppingCart, Package, CheckCircle2, Scissors, Truck, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_STEPS = ['pending', 'partially_processing', 'partially_shipped', 'completed'];

export default function MasterOrderDetail({ order, open, onClose, isAdmin, onSplitClick }) {
  const [editingTracking, setEditingTracking] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const queryClient = useQueryClient();

  const updateOrderMutation = useMutation({
    mutationFn: (data) => api.updateOrder(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders']});
      toast.success('Tracking number saved');
      setEditingTracking(false);
    },
  });

  const markShippedMutation = useMutation({
    mutationFn: () => api.updateOrder(order.id, { status: 'partially_shipped', tracking_number: order.tracking_number || trackingInput || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders']});
      toast.success('Order marked as shipped');
    },
  });

  const { data: subOrders = [] } = useQuery({
    queryKey: ['sub-orders', order?.id],
    queryFn: () => api.getSubOrders({ parent_order_id: order.id }),
    enabled: !!order?.id && open,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-for-order', order?.id],
    queryFn: () => api.getInvoices({order: '-created_at', limit: 100}),
    enabled: !!order?.id && open,
  });

  if (!order) return null;

  const currentStepIdx = STATUS_STEPS.indexOf(order.status);

  const stepIcons = [ShoppingCart, Package, Package, CheckCircle2];
  const stepLabels = ['Pending', 'Processing', 'Shipped', 'Completed'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Order {order.order_number || `ORD-${order.id?.slice(-6)}`}
            </DialogTitle>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-500">{order.client_name} · {order.title}</p>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Progress Steps */}
          <div className="relative">
            <div className="flex justify-between mb-1">
              {stepLabels.map((label, idx) => {
                const Icon = stepIcons[idx];
                const isActive = currentStepIdx >= idx;
                return (
                  <div key={label} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-[#1e3a5f] text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-xs mt-1 text-center ${isActive ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-10" />
          </div>

          {/* Order Summary */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-slate-500">Order Date</p>
              <p className="font-semibold text-sm">{order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Amount</p>
              <p className="font-semibold text-sm">${(order.total_amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sub-Orders</p>
              <p className="font-semibold text-sm">{subOrders.length || '—'}</p>
            </div>
          </div>

          {/* Tracking Number & Ship */}
          {(order.tracking_number || isAdmin) && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-500" /> Tracking Number
                </p>
                <div className="flex items-center gap-2">
                  {isAdmin && order.status !== 'partially_shipped' && !editingTracking && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setTrackingInput(order.tracking_number || ''); setEditingTracking(true); }}>
                      {order.tracking_number ? 'Edit' : '+ Add Tracking'}
                    </Button>
                  )}
                  {isAdmin && order.status === 'pending' && order.tracking_number && !editingTracking && (
                    <Button size="sm" className="text-xs h-7 gap-1 bg-[#1e3a5f] hover:bg-[#2d5a8a]" onClick={() => markShippedMutation.mutate()} disabled={markShippedMutation.isPending}>
                      <Send className="h-3 w-3" /> Mark Shipped
                    </Button>
                  )}
                </div>
              </div>
              {editingTracking ? (
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 text-sm"
                    placeholder="Enter tracking number..."
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    autoFocus
                  />
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingTracking(false)}>Cancel</Button>
                  <Button size="sm" className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#2d5a8a]" onClick={() => updateOrderMutation.mutate({ tracking_number: trackingInput })} disabled={updateOrderMutation.isPending}>
                    Save
                  </Button>
                </div>
              ) : order.tracking_number ? (
                <p className="font-mono text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-2">{order.tracking_number}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No tracking number added yet</p>
              )}
            </div>
          )}

          {/* All Items (master view) */}
          {!order.is_split && order.items?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">All Items</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium w-16">Qty</th>
                      <th className="text-right p-3 font-medium w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3">{item.description || '—'}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right font-medium">${(item.total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isAdmin && !order.is_split && (
                <Button
                  className="mt-3 gap-2 bg-[#1e3a5f] hover:bg-[#2d5a8a]"
                  size="sm"
                  onClick={onSplitClick}
                >
                  <Scissors className="h-4 w-4" /> Split Order
                </Button>
              )}
            </div>
          )}

          {/* Sub-Orders */}
          {subOrders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Fulfillment Breakdown</p>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={onSplitClick}>
                    <Scissors className="h-3.5 w-3.5" /> Re-split
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {subOrders.map(so => (
                  <SubOrderPanel key={so.id} subOrder={so} isAdmin={isAdmin} invoices={invoices} />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}