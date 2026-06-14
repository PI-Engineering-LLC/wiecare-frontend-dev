import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';

const SUPPLIERS = ['Wiegand Germany', 'Wiegand Sports USA'];

export default function SplitOrderDialog({ order, open, onClose, onSuccess }) {
  // itemAssignments: { [itemIdx]: supplier }
  const [assignments, setAssignments] = useState({});
  const [saving, setSaving] = useState(false);

  const items = order?.items || [];

  const handleAssign = (idx, supplier) => {
    setAssignments(prev => ({ ...prev, [idx]: supplier }));
  };

  const allAssigned = items.length > 0 && items.every((_, idx) => assignments[idx]);

  const handleSplit = async () => {
    if (!allAssigned) {
      toast.error('Please assign every item to a supplier before splitting.');
      return;
    }

    setSaving(true);

    // Group items by supplier
    const groups = {};
    items.forEach((item, idx) => {
      const supplier = assignments[idx];
      if (!groups[supplier]) groups[supplier] = [];
      groups[supplier].push(item);
    });

    // Create sub-orders
    const subOrderPromises = Object.entries(groups).map(([supplier, supplierItems]) => {
      const total = supplierItems.reduce((s, i) => s + (i.total || 0), 0);
      return api.createSubOrder(order.id , {
        sub_order_number: `${order.order_number || order.id.slice(-6)}-${supplier === 'Wiegand Germany' ? 'DE' : 'USA'}-${Date.now()}`,
        parent_order_id: order.id,
        client_id: order.client_id,
        client_name: order.client_name,
        supplier_entity: supplier,
        items: supplierItems,
        total_amount: total,
        status: 'awaiting_invoice',
      });
    });

    await Promise.all(subOrderPromises);

    // Mark master order as split
    await api.updateOrder(order.id, {
      is_split: true,
      status: 'partially_processing',
    });

    setSaving(false);
    toast.success('Order split into sub-orders successfully');
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-[#1e3a5f]" /> Split Order into Sub-Orders
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Assign each line item to a supplier entity. Each supplier will get its own sub-order and invoice.
          </p>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {/* Legend */}
          <div className="flex gap-4 text-xs text-slate-500 mb-2">
            {SUPPLIERS.map(s => (
              <span key={s} className={`px-2 py-1 rounded-full font-medium ${s === 'Wiegand Germany' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {s}
              </span>
            ))}
          </div>

          {/* Item table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-right p-3 font-medium w-16">Qty</th>
                  <th className="text-right p-3 font-medium w-24">Total</th>
                  <th className="text-left p-3 font-medium w-52">Assign To</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{item.description || '—'}</p>
                      {(item.item_number || item.ez_number) && (
                        <p className="text-xs text-slate-400">{item.item_number} {item.ez_number && `/ EZ: ${item.ez_number}`}</p>
                      )}
                    </td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right font-medium">${(item.total || 0).toLocaleString()}</td>
                    <td className="p-3">
                      <Select value={assignments[idx] || ''} onValueChange={(v) => handleAssign(idx, v)}>
                        <SelectTrigger className={`h-8 text-xs ${!assignments[idx] ? 'border-red-200' : ''}`}>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPLIERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          {Object.keys(assignments).length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Preview</p>
              {SUPPLIERS.map(supplier => {
                const assignedItems = items.filter((_, idx) => assignments[idx] === supplier);
                if (assignedItems.length === 0) return null;
                const total = assignedItems.reduce((s, i) => s + (i.total || 0), 0);
                return (
                  <div key={supplier} className={`rounded-lg p-3 border ${supplier === 'Wiegand Germany' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                    <p className={`text-sm font-semibold ${supplier === 'Wiegand Germany' ? 'text-blue-700' : 'text-amber-700'}`}>{supplier}</p>
                    <p className="text-xs text-slate-600">{assignedItems.length} item(s) · ${total.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSplit}
            disabled={!allAssigned || saving}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Scissors className="h-4 w-4 mr-2" />
            {saving ? 'Creating Sub-Orders...' : 'Create Sub-Orders'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}