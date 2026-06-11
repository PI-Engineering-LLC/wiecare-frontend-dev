import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/api/apiClient';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Shared parts cache so we only load once
let cachedParts = null;
let partsPromise = null;
function loadParts() {
  if (cachedParts) return Promise.resolve(cachedParts);
  if (!partsPromise) {
    partsPromise = api.getParts({order: 'name', limit: 500}).then(p => { cachedParts = p; return p; });
  }
  return partsPromise;
}

export default function PartAutocomplete({ value, onChange, onSelect, placeholder, className, parts: partsProp }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState(partsProp || cachedParts || []);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const skipBlurRef = useRef(false);
  const debouncedQuery = useDebounce(query, 250);

  // Sync external value changes
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Load parts
  useEffect(() => {
    if (partsProp) { setParts(partsProp); return; }
    loadParts().then(setParts).catch(() => {});
  }, [partsProp]);

  // Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const q = debouncedQuery.toLowerCase();
    const exact = [], partial = [];
    for (const p of parts) {
      const a = (p.part_number || '').toLowerCase();
      const b = (p.ez_number || '').toLowerCase();
      const c = (p.name || '').toLowerCase();
      if (a === q || b === q || c === q) exact.push(p);
      else if (a.includes(q) || b.includes(q) || c.includes(q)) partial.push(p);
    }
    const combined = [...exact, ...partial].slice(0, 10);
    setResults(combined);
    setHighlighted(-1);
    if (combined.length > 0) setOpen(true);
  }, [debouncedQuery, parts]);

  // Compute dropdown position (fixed, relative to input)
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 300),
      zIndex: 99999,
      pointerEvents: 'auto',
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const commitSelect = useCallback((part) => {
    skipBlurRef.current = false;
    setOpen(false);
    setResults([]);
    setQuery(part.name || '');
    onSelect?.(part);
  }, [onSelect]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange?.(v);
  };

  const handleBlur = () => {
    // Delay close so mousedown on dropdown option fires first
    setTimeout(() => {
      if (!skipBlurRef.current) setOpen(false);
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      commitSelect(results[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.querySelectorAll('[data-option]')[highlighted];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        // @ts-ignore
        className={className}
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={() => { if (results.length > 0) { updatePosition(); setOpen(true); } }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && results.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl"
          onMouseDown={(e) => {
            // Prevent input blur from firing before click
            e.preventDefault();
            skipBlurRef.current = true;
          }}
        >
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {results.map((p, idx) => (
              <div
                key={p.id}
                data-option
                className={`w-full text-left px-3 py-2.5 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${
                  highlighted === idx ? 'bg-[#edf0be]' : 'hover:bg-[#edf0be]'
                }`}
                onMouseEnter={() => setHighlighted(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  skipBlurRef.current = true;
                }}
                onClick={() => commitSelect(p)}
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
      )}
    </div>
  );
}