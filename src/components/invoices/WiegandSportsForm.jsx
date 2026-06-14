import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LineItemsTable from '@/components/shared/LineItemsTable';

export default function WiegandSportsForm({ formData, setFormData, clients }) {
  const selectedClient = clients.find(c => c.id === formData.client_id);

  const subtotal = (formData.items || []).reduce((s, i) => s + (parseFloat(i.amount) || parseFloat(i.total) || 0), 0);
  const vatAmount = subtotal * ((parseFloat(formData.tax_rate) || 0) / 100);
  const credit = parseFloat(formData.credit) || 0;
  const total = subtotal + vatAmount - credit;

  return (
    <div className="space-y-6">
      {/* Header Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Document Number *</Label>
          <Input className="mt-1" placeholder="e.g. 2024-001" value={formData.invoice_number || ''} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} />
        </div>
        <div>
          <Label>Invoice Date *</Label>
          <Input type="date" className="mt-1" value={formData.issue_date || ''} onChange={(e) => {const issueDate = e.target.value;
            const due = issueDate ? new Date(new Date(issueDate + 'T00:00:00').getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
            setFormData({ ...formData, issue_date: issueDate, due_date: due });}} />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" className="mt-1" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
        </div>
        <div>
          <Label>Customer Number</Label>
          <Input className="mt-1 bg-slate-50" value={selectedClient?.customer_number || ''} readOnly placeholder="Auto-populated from client" />
        </div>
        <div>
          <Label>Title / Subject *</Label>
          <Input className="mt-1" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Invoice title" />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <LineItemsTable
          items={formData.items || []}
          onChange={(newItems) => setFormData({ ...formData, items: newItems })}
          showUnit={false}
        />
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-2 max-w-xs ml-auto">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        {(formData.credit > 0 || formData._showCredit) ? (
          <div className="flex justify-between items-center text-sm gap-2">
            <button type="button" className="text-slate-600 hover:text-rose-500 text-left transition-colors text-sm" onClick={() => setFormData({ ...formData, credit: 0, _showCredit: false })}>
              Credit ✕
            </button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">$</span>
              <Input type="number" className="w-28 h-7 text-xs text-right" placeholder="0.00" value={formData.credit || ''} onChange={(e) => setFormData({ ...formData, credit: parseFloat(e.target.value) || 0 })} />
            </div>
            <span className="font-medium text-emerald-600">-${credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        ) : (
          <button type="button" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors" onClick={() => setFormData({ ...formData, _showCredit: true })}>
            + Add Credit
          </button>
        )}
        <div className="flex justify-between items-center text-sm gap-2">
          <span className="text-slate-600 shrink-0">VAT</span>
          <div className="flex items-center gap-1">
            <Input type="number" className="w-16 h-7 text-xs" placeholder="Tax code" value={formData.tax_code || ''} onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })} />
            <span className="text-xs text-slate-500">code</span>
            <Input type="number" className="w-14 h-7 text-xs" value={formData.tax_rate || 0} onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })} />
            <span className="text-xs">%</span>
          </div>
          <span className="font-medium">${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Total</span>
          <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        <Textarea className="mt-1" rows={3} value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Payment terms, bank details, additional notes..." />
      </div>
    </div>
  );
}