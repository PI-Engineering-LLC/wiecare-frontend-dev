import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LineItemsTable from '@/components/shared/LineItemsTable';

const OPTIONAL_CHARGES = [
  { key: 'packing', label: 'Packing' },
  { key: 'export_declaration', label: 'Export Declaration' },
  { key: 'customs_fees', label: 'Custom Fees' },
  { key: 'freight', label: 'Freight' },
];

export default function WiegandServicesForm({ formData, setFormData, clients }) {
  const [activeCharges, setActiveCharges] = useState(() => {
    const active = {};
    OPTIONAL_CHARGES.forEach(c => { if (formData[c.key] > 0) active[c.key] = true; });
    return active;
  });

  const selectedClient = clients.find(c => c.id === formData.client_id);

  const toggleCharge = (key) => {
    const next = { ...activeCharges, [key]: !activeCharges[key] };
    setActiveCharges(next);
    if (!next[key]) setFormData({ ...formData, [key]: 0 });
  };

  const subtotal = (formData.items || []).reduce((s, i) => s + (parseFloat(i.amount) || parseFloat(i.total) || 0), 0);
  const salesTax = parseFloat(formData.sales_tax) || 0;
  const packing = activeCharges.packing ? (parseFloat(formData.packing) || 0) : 0;
  const exportDecl = activeCharges.export_declaration ? (parseFloat(formData.export_declaration) || 0) : 0;
  const customsFees = activeCharges.customs_fees ? (parseFloat(formData.customs_fees) || 0) : 0;
  const freight = activeCharges.freight ? (parseFloat(formData.freight) || 0) : 0;
  const credit = parseFloat(formData.credit) || 0;
  const total = subtotal + salesTax + packing + exportDecl + customsFees + freight - credit;

  return (
    <div className="space-y-6">
      {/* Header Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Document Number *</Label>
          <Input className="mt-1" placeholder="e.g. WS-2024-001" value={formData.invoice_number || ''} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} />
        </div>
        <div>
          <Label>Invoice Date *</Label>
          <Input type="date" className="mt-1" value={formData.issue_date || ''} onChange={(e) => {
            const issueDate = e.target.value;
            const due = issueDate ? new Date(new Date(issueDate).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
            setFormData({ ...formData, issue_date: issueDate, due_date: due });
          }} />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" className="mt-1" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
        </div>
        <div>
          <Label>Customer ID</Label>
          <Input className="mt-1 bg-slate-50" value={selectedClient?.customer_id || selectedClient?.customer_number || ''} readOnly placeholder="Auto-populated from client" />
        </div>
        <div>
          <Label>Customer PO Number</Label>
          <Input className="mt-1" value={formData.po_number || ''} onChange={(e) => setFormData({ ...formData, po_number: e.target.value })} placeholder="Customer's PO number" />
        </div>
      </div>

      {/* Bill To */}
      <div className="border rounded-lg p-4 bg-slate-50/50">
        <Label className="text-base font-semibold mb-3 block">Bill To</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-500">Customer</Label>
            <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
              <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Address (auto-populated)</Label>
            <div className="mt-1 bg-white border rounded-md px-3 py-2 text-sm text-slate-700 min-h-[38px]">
              {selectedClient
                ? <span>{[selectedClient.address, selectedClient.city, selectedClient.country].filter(Boolean).join(', ') || 'No address on file'}</span>
                : <span className="text-slate-400">Select customer to auto-populate</span>}
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Title / Subject *</Label>
            <Input className="mt-1 bg-white" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Invoice title" />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <LineItemsTable
          items={formData.items || []}
          onChange={(newItems) => setFormData({ ...formData, items: newItems })}
          showUnit={true}
        />
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-2 max-w-sm ml-auto">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600">Sales Tax</span>
          <Input type="number" className="w-32 h-7 text-xs text-right" placeholder="0.00" value={formData.sales_tax || ''} onChange={(e) => setFormData({ ...formData, sales_tax: parseFloat(e.target.value) || 0 })} />
        </div>
        {OPTIONAL_CHARGES.map(charge => (
          <div key={charge.key} className="flex justify-between items-center text-sm">
            {activeCharges[charge.key] ? (
              <>
                <button type="button" className="text-slate-600 hover:text-rose-500 text-left transition-colors" onClick={() => toggleCharge(charge.key)}>
                  {charge.label} ✕
                </button>
                <Input type="number" className="w-32 h-7 text-xs text-right" placeholder="0.00" value={formData[charge.key] || ''} onChange={(e) => setFormData({ ...formData, [charge.key]: parseFloat(e.target.value) || 0 })} />
              </>
            ) : (
              <button type="button" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors" onClick={() => toggleCharge(charge.key)}>
                + Add {charge.label}
              </button>
            )}
          </div>
        ))}
        {(formData.credit > 0 || formData._showCredit) ? (
          <div className="flex justify-between items-center text-sm">
            <button type="button" className="text-slate-600 hover:text-rose-500 text-left transition-colors" onClick={() => setFormData({ ...formData, credit: 0, _showCredit: false })}>
              Credit ✕
            </button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">$</span>
              <Input type="number" className="w-32 h-7 text-xs text-right" placeholder="0.00" value={formData.credit || ''} onChange={(e) => setFormData({ ...formData, credit: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        ) : (
          <button type="button" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors" onClick={() => setFormData({ ...formData, _showCredit: true })}>
            + Add Credit
          </button>
        )}
        {credit > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 font-medium">
            <span>Credit Applied</span>
            <span>-${credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Total</span>
          <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}