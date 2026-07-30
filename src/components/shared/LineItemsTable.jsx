import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/api/apiClient';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from 'lucide-react';

const LINE_TYPE_OPTIONS = [
  { value: 'product', label: 'Product' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'training', label: 'Training' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

const LINE_TYPE_COLORS = {
  product: 'bg-blue-50 text-blue-700',
  maintenance: 'bg-orange-50 text-orange-700',
  training: 'bg-purple-50 text-purple-700',
  travel: 'bg-teal-50 text-teal-700',
  other: 'bg-slate-50 text-slate-600',
};

// Shared parts cache
let cachedParts = null;
let partsPromise = null;
function loadParts() {
  if (cachedParts) return Promise.resolve(cachedParts);
  if (!partsPromise) {
    partsPromise = api.getParts({order: 'name', limit: 500}).then(p => { cachedParts = p; return p; });
  }
  return partsPromise;
}

function searchParts(parts, query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const exact = [], partial = [];
  for (const p of parts) {
    const a = (p.part_number || '').toLowerCase();
    const b = (p.ez_number || '').toLowerCase();
    const c = (p.name || '').toLowerCase();
    if (a === q || b === q || c === q) exact.push(p);
    else if (a.includes(q) || b.includes(q) || c.includes(q)) partial.push(p);
  }
  return [...exact, ...partial].slice(0, 10);
}

// The single dropdown rendered via portal
function Dropdown({ style, results, highlighted, onSelect, onMouseEnter, onMouseDown }) {
  const ref = useRef(null);

  useEffect(() => {
    if (highlighted >= 0 && ref.current) {
      ref.current.querySelectorAll('[data-opt]')[highlighted]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  if (!results.length) return null;

  return createPortal(
    <div
      ref={ref}
      style={{ ...style, position: 'fixed', zIndex: 99999, pointerEvents: 'auto' }}
      className="bg-white border border-slate-200 rounded-xl shadow-2xl"
      onMouseDown={onMouseDown}
    >
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {results.map((p, idx) => (
          <div
            key={p.id}
            data-opt
            className={`px-3 py-2.5 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${highlighted === idx ? 'bg-[#edf0be]' : 'hover:bg-[#edf0be]'}`}
            onMouseEnter={() => onMouseEnter(idx)}
            onClick={() => onSelect(p)}
          >
            <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
            <p className="text-xs text-slate-500 flex gap-2 mt-0.5">
              {p.part_number && <span>Item: {p.part_number}</span>}
              {p.ez_number && <span>EZ: {p.ez_number}</span>}
              {p.unit_price > 0 && <span className="text-[#005f27] font-medium">${p.unit_price}</span>}
            </p>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

/**
 * LineItemsTable — shared table for Quotes and Invoices
 *
 * Props:
 *   items          — array of line item objects
 *   onChange       — (newItems) => void
 *   showUnit       — boolean (show unit column, for WiegandServices)
 *   showLineType   — boolean (show line type column for mixed quotes/invoices)
 *   currency       — string, default "USD"
 */
export default function LineItemsTable({ items, onChange, showUnit = false, showLineType = false }) {
  const [parts, setParts] = useState(cachedParts || []);

  // Single shared dropdown state
  const [dropOpen, setDropOpen] = useState(false);
  const [dropResults, setDropResults] = useState([]);
  const [dropStyle, setDropStyle] = useState({});
  const [highlighted, setHighlighted] = useState(-1);
  const [activeCell, setActiveCell] = useState(null); // { rowIdx, field }

  const skipBlurRef = useRef(false);
  const activeInputRef = useRef(null);

  useEffect(() => {
    loadParts().then(setParts).catch(() => {});
  }, []);

  const closeDropdown = useCallback(() => {
    setDropOpen(false);
    setDropResults([]);
    setActiveCell(null);
    setHighlighted(-1);
  }, []);

  const openDropdownFor = useCallback((inputEl, rowIdx, field, query) => {
    const results = searchParts(parts, query);
    if (!results.length) { closeDropdown(); return; }

    const rect = inputEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < 248 + 8 && rect.top > 248;

    setDropStyle({
      left: rect.left,
      width: Math.max(rect.width, 300),
      ...(openAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
    setDropResults(results);
    setHighlighted(-1);
    setActiveCell({ rowIdx, field });
    setDropOpen(true);
  }, [parts]);

  const handleInputChange = useCallback((e, rowIdx, field) => {
    const v = e.target.value;
    const newItems = items.map((item, i) => i === rowIdx ? { ...item, [field]: v } : item);
    onChange(newItems);
    activeInputRef.current = e.target;
    openDropdownFor(e.target, rowIdx, field, v);
  }, [items, onChange, openDropdownFor]);

  const handleInputFocus = useCallback((e, rowIdx, field) => {
    activeInputRef.current = e.target;
    const item = items[rowIdx];
    const query = item[field] || '';
    openDropdownFor(e.target, rowIdx, field, query);
  }, [items, openDropdownFor]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (!skipBlurRef.current) closeDropdown();
      skipBlurRef.current = false;
    }, 150);
  }, [closeDropdown]);

  const handleInputKeyDown = useCallback((e) => {
    if (!dropOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, dropResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); commitSelect(dropResults[highlighted]); }
    else if (e.key === 'Escape') { closeDropdown(); }
  }, [dropOpen, dropResults, highlighted, closeDropdown]);

  const commitSelect = useCallback((part) => {
    skipBlurRef.current = false;
    if (!activeCell) { closeDropdown(); return; }
    const { rowIdx } = activeCell;
    const newItems = items.map((item, i) => {
      if (i !== rowIdx) return item;
      const newEzNumber = (part.ez_number) ?? '';
      // console.log(newEzNumber, part.ez_number,item.ez_number,item.z_number, part.z_number  )
      return {
        ...item,
        item_number: part.part_number || item.item_number || '',
        ez_number: newEzNumber,
        z_number: newEzNumber,
        // ez_number: part.ez_number || item.ez_number || item.z_number || part.z_number || '' ,
        // z_number: part.ez_number || item.z_number || '',
        description: part.name || item.description || '',
        unit_price: part.unit_price ?? (parseFloat(item.unit_price) || 0),
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(part.unit_price) || 0),
        total: (parseFloat(item.quantity) || 1) * (parseFloat(part.unit_price) || 0),
      };
    });
    onChange(newItems);
    closeDropdown();
  }, [activeCell, items, onChange, closeDropdown]);

  const addItem = () => {
    closeDropdown();
    onChange([
      ...items,
      { line: items.length + 1, item_number: '', ez_number: '', z_number: '', description: '', quantity: 1, unit: 'each', unit_price: 0, amount: 0, total: 0, line_type: 'product' }
    ]);
  };

  const removeItem = (idx) => {
    closeDropdown();
    // if (items.length > 1) onChange(items.filter((_, i) => i !== idx));

    const newItems = items.filter((_, i) => i !== idx);
  
  // If we removed the last item, add a fresh empty one instead of leaving it empty
  if (newItems.length === 0) {
    onChange([
      { line: 1, item_number: '', ez_number: '', z_number: '', description: '', quantity: 1, unit: 'each', unit_price: 0, amount: 0, total: 0, line_type: 'product' }
    ]);
  } else {
    onChange(newItems);
  }
    
  };

  const updateItemField = (idx, field, value) => {
    const newItems = items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? parseFloat(value) : parseFloat(item.quantity);
        const price = field === 'unit_price' ? parseFloat(value) : parseFloat(item.unit_price);
        updated.amount = (qty || 0) * (price || 0);
        updated.total = updated.amount;
      }
      return updated;
    });
    onChange(newItems);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Line Items</span>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-left px-2 py-2 font-medium text-slate-600 w-8">#</th>
              <th className="text-left px-2 py-2 font-medium text-slate-600">Item No.</th>
              <th className="text-left px-2 py-2 font-medium text-slate-600">EZ No.</th>
              <th className="text-left px-2 py-2 font-medium text-slate-600">Description</th>
              {showLineType && <th className="text-left px-2 py-2 font-medium text-slate-600 w-28">Type</th>}
              <th className="text-left px-2 py-2 font-medium text-slate-600 w-16">Qty</th>
              {showUnit && <th className="text-left px-2 py-2 font-medium text-slate-600 w-24">Unit</th>}
              <th className="text-left px-2 py-2 font-medium text-slate-600 w-24">Unit Price</th>
              <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-2 py-1.5 text-slate-500">{idx + 1}</td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    value={item.item_number || ''}
                    placeholder="Item #"
                    autoComplete="off"
                    onChange={(e) => handleInputChange(e, idx, 'item_number')}
                    onFocus={(e) => handleInputFocus(e, idx, 'item_number')}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    value={(item.ez_number)??''}
                    placeholder="EZ #"
                    autoComplete="off"
                    onChange={(e) => handleInputChange(e, idx, 'ez_number')}
                    onFocus={(e) => handleInputFocus(e, idx, 'ez_number')}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    value={item.description || ''}
                    placeholder="Description"
                    autoComplete="off"
                    onChange={(e) => handleInputChange(e, idx, 'description')}
                    onFocus={(e) => handleInputFocus(e, idx, 'description')}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                  />
                </td>
                {showLineType && (
                  <td className="px-2 py-1.5">
                    <Select value={item.line_type || 'product'} onValueChange={(v) => updateItemField(idx, 'line_type', v)}>
                      <SelectTrigger className={`h-8 text-xs border-0 ${LINE_TYPE_COLORS[item.line_type || 'product']}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <Input className="h-8" type="number" value={item.quantity ?? 1} onChange={(e) => updateItemField(idx, 'quantity', e.target.value)} />
                </td>
                {showUnit && (
                  <td className="px-2 py-1.5">
                    <Select value={item.unit || 'each'} onValueChange={(v) => updateItemField(idx, 'unit', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="each">Each</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                        <SelectItem value="set">Set</SelectItem>
                        <SelectItem value="lot">Lot</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <Input className="h-8" type="number" value={item.unit_price ?? 0} onChange={(e) => updateItemField(idx, 'unit_price', e.target.value)} />
                </td>
                <td className="px-2 py-1.5 text-right font-medium">
                  ${((parseFloat(item.amount) || parseFloat(item.total) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-1.5">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)} 
                  // disabled={items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dropOpen && (
        <Dropdown
          style={dropStyle}
          results={dropResults}
          highlighted={highlighted}
          onSelect={commitSelect}
          onMouseEnter={setHighlighted}
          onMouseDown={(e) => { e.preventDefault(); skipBlurRef.current = true; }}
        />
      )}
    </>
  );
}