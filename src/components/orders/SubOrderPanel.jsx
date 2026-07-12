import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Truck, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = {
  awaiting_invoice: 'bg-slate-100 text-slate-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
  awaiting_invoice: 'Awaiting Invoice',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

export default function SubOrderPanel({ subOrder, isAdmin, invoices = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: subOrder.status,
    tracking_number: subOrder.tracking_number || '',
    estimated_delivery: subOrder.estimated_delivery || '',
    admin_notes: subOrder.admin_notes || '',
  });

  const queryClient = useQueryClient();
  const isGermany = subOrder.supplier_entity === 'Wiegand Germany';

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateSubOrder( subOrder.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-orders']});
      queryClient.invalidateQueries({ queryKey: ['admin-orders']});
      toast.success('Sub-order updated');
      setEditing(false);
    },
  });

  const linkedInvoice = invoices.find(inv => inv.id === subOrder.invoice_id);

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${isGermany ? 'border-blue-200' : 'border-amber-200'}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer ${isGermany ? 'bg-blue-50' : 'bg-amber-50'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Truck className={`h-5 w-5 ${isGermany ? 'text-blue-600' : 'text-amber-600'}`} />
          <div>
            <p className={`font-semibold text-sm ${isGermany ? 'text-blue-800' : 'text-amber-800'}`}>
              {subOrder.supplier_entity}
            </p>
            <p className="text-xs text-slate-500">{subOrder.items?.length || 0} items · ${(subOrder.total_amount || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[subOrder.status]}`}>
            {STATUS_LABELS[subOrder.status] || subOrder.status}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 font-medium">Description</th>
                    <th className="text-right p-2 font-medium w-16">Qty</th>
                    <th className="text-right p-2 font-medium w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(subOrder.items || []).map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">
                        <p>{item.description || '—'}</p>
                        {(item.item_number || item.ez_number) && (
                          <p className="text-xs text-slate-400">{item.item_number}{item.ez_number ? ` / EZ: ${item.ez_number}` : ''}</p>
                        )}
                      </td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right font-medium">${(item.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Invoice
            </p>
            {linkedInvoice ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">{linkedInvoice.invoice_number || `INV-${linkedInvoice.id?.slice(-6)}`}</p>
                  <p className="text-xs text-green-600">${(linkedInvoice.total_amount || 0).toLocaleString()} · {linkedInvoice.status}</p>
                </div>
                {linkedInvoice.pdf_url && (
                  <a href={linkedInvoice.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline">View PDF</a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No invoice linked yet{isAdmin ? ' — link from Invoices page' : ''}</p>
            )}
          </div>

          {/* Tracking */}
          {(subOrder.tracking_number || subOrder.estimated_delivery) && !editing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {subOrder.tracking_number && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tracking #</p>
                  <p className="font-medium">{subOrder.tracking_number}</p>
                </div>
              )}
              {subOrder.estimated_delivery && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Est. Delivery</p>
                  <p className="font-medium">{subOrder.estimated_delivery}</p>
                </div>
              )}
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div className="border-t pt-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={updateData.status} onValueChange={(v) => setUpdateData({ ...updateData, status: v })}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="awaiting_invoice">Awaiting Invoice</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tracking #</Label>
                      <Input className="mt-1 h-8 text-xs" value={updateData.tracking_number} onChange={(e) => setUpdateData({ ...updateData, tracking_number: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Est. Delivery</Label>
                      <Input type="date" className="mt-1 h-8 text-xs" value={updateData.estimated_delivery?.split('T')[0]} onChange={(e) => setUpdateData({ ...updateData, estimated_delivery: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2d5a8a]" onClick={() => updateMutation.mutate(updateData)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit Sub-Order</Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}