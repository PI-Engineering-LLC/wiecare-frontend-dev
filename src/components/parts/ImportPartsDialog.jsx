import React, { useEffect, useState } from 'react';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";


function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  
  return lines.slice(1).map(line => {
    // Handle quoted values
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  }).filter(row => Object.values(row).some(v => v));
}

// Map CSV columns to Part fields
function mapRowToPart(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k] || row[k.replace(/_/g, '')] || row[k.replace(/_/g, ' ')];
      if (val) return val;
    }
    return '';
  };

  const part_number = get('part_number', 'item_id', 'item_number', 'sku', 'partnumber', 'id');
  const name = get('name', 'description', 'part_name', 'item_name', 'title');
  const description = get('description', 'desc', 'details', 'notes');
  const ez_number = get('ez_number', 'ez_no', 'eznumber', 'ez');
  const rawPrice = get('unit_price', 'price', 'base_price', 'cost', 'unit_cost');
  const unit_price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
  const rawQty = get('stock_quantity', 'quantity', 'qty', 'stock', 'in_stock');
  const stock_quantity = parseInt(rawQty) || 0;
  const rawCategory = get('category', 'type', 'part_type');
  const validCategories = ['brakes', 'wheels', 'seats', 'safety', 'electronics', 'hydraulics', 'structural', 'accessories', 'general', 'critical'];
  const category = validCategories.includes(rawCategory?.toLowerCase()) ? rawCategory.toLowerCase() : 'general';

  return { part_number, name, description, ez_number, unit_price, stock_quantity, category, currency: 'USD', min_stock_level: 5, status: 'active', is_critical: false };
}

export default function ImportPartsDialog({ open, onOpenChange, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  // const [progress, setProgress] = useState({ status: 'idle', processed: 0, failed: 0 });
  const [importProgress, setImportProgress] = useState({ 
    status: 'idle', 
    processed_rows: 0, 
    failed_rows: 0 
  })

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target.result);
      const mapped = rows.map(mapRowToPart).filter(p => p.part_number && p.name);
      setPreview(mapped);
    };
    reader.readAsText(f);
  };

  
  // useEffect(() => {
  //   if (!open) return; // Only poll when open

  //   const interval = setInterval(async () => {
  //     const response = await api.getPartImport(importId);
  //     const data = await response.json();
  //     setProgress(data);

  //     if (data.status === 'completed' || data.status === 'failed') {
  //       clearInterval(interval);
  //     }
  //   }, 2000);

  //   return () => clearInterval(interval); // Clean up on unmount or close
  // }, [open]);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const handleImport = async () => {
    // if (!preview.length) return;
    if (!file) return;
    setImporting(true);
    // setImportProgress(0);
    // let success = 0, failed = 0;

    // 1. Send single multipart request
  // const formData = new FormData();
  // formData.append('file', file);
  try{
    console.log(file)
    const data = await api.importParts(file)
    console.log("@@@@@", data)
    const importId = data.import_id;
     // 2. Poll for status
     const poll = setInterval(async () => { 
      try{
      const status  = await api.getPartImport(importId);
      console.log("@@@@@Stat", status)
      // Update progress bar
      // setImportProgress(status.processed_rows);
      setImportProgress(status);

      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(poll);
        setImporting(false);
        setResults({ 
          success: status.processed_rows, 
          failed: status.failed_rows 
        });
        toast.success("Import complete!");
        onImported?.()
      }
    }catch (err) {
      clearInterval(poll);
      setImporting(false);
      toast.error("Error polling import status");
    }

     }, 2000); // Poll every 2 seconds
  }catch(error){
    setImporting(false);
    toast.error("Failed to start import");
  }

    // for (let i = 0; i < preview.length; i++) {
    //   try {
    //     await 	api.createParts(preview[i]);
    //     success++;
    //   } catch {
    //     failed++;
    //   }
    //   setImportProgress(i + 1);
    //   // Small delay to avoid rate limiting
    //   await sleep(300);
    // }

    // setImporting(false);
    // setResults({ success, failed });
    // if (success > 0) {
    //   toast.success(`Imported ${success} parts successfully`);
    //   onImported?.();
    // }
    // if (failed > 0) toast.error(`${failed} parts failed to import`);
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setResults(null);
    setImportProgress({ status: 'idle', processed_rows: 0, failed_rows: 0 });
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#005f27]" />
            Import Parts from CSV
          </DialogTitle>
        </DialogHeader>
        {/* Unified Progress UI */}
        {importing && (
          <div className="space-y-2 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Importing parts...</span>
              <span className="font-mono">{importProgress.processed_rows} success / {importProgress.failed_rows} failed</span>
            </div>
            <Progress value={preview.length > 0 ? (importProgress.processed_rows / preview.length) * 100 : 0} />
          </div>
        )}
        <div className="space-y-4 py-2">
          {/* Upload area */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#005f27]/40 transition-colors">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-import-input"
            />
            <label htmlFor="csv-import-input" className="cursor-pointer">
              <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">{file ? file.name : 'Click to upload a CSV file'}</p>
              <p className="text-xs text-slate-400 mt-1">Columns: part_number, name, description, ez_number, unit_price, stock_quantity, category</p>
            </label>
          </div>

          {/* Preview */}
          {/* {preview.length > 0 && !results && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Preview — {preview.length} parts found</p>
                <Badge className="bg-[#edf0be] text-[#005f27]">{preview.length} rows</Badge>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Part #</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">EZ #</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Price</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 8).map((p, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-600">{p.part_number}</td>
                        <td className="px-3 py-2 text-slate-500">{p.ez_number || '—'}</td>
                        <td className="px-3 py-2 text-slate-800 max-w-[180px] truncate">{p.name}</td>
                        <td className="px-3 py-2">{p.unit_price > 0 ? `$${p.unit_price}` : '—'}</td>
                        <td className="px-3 py-2 capitalize text-slate-500">{p.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 8 && (
                  <p className="px-3 py-2 text-xs text-slate-400 bg-slate-50 border-t">
                    + {preview.length - 8} more rows...
                  </p>
                )}
              </div>
            </div>
          )} */}
          {!importing && !results && preview.length > 0 && (
  <div>
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-semibold text-slate-700">Preview — {preview.length} parts found</p>
      <Badge className="bg-[#edf0be] text-[#005f27]">{preview.length} rows</Badge>
    </div>
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Part #</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">EZ #</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Price</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 8).map((p, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-600">{p.part_number}</td>
                        <td className="px-3 py-2 text-slate-500">{p.ez_number || '—'}</td>
                        <td className="px-3 py-2 text-slate-800 max-w-[180px] truncate">{p.name}</td>
                        <td className="px-3 py-2">{p.unit_price > 0 ? `$${p.unit_price}` : '—'}</td>
                        <td className="px-3 py-2 capitalize text-slate-500">{p.category}</td>
                      </tr>
                    ))}
                  </tbody>
      </table>
    </div>
  </div>
)}

          {/* Results */}
          {results && (
            <div className="flex flex-col items-center py-4 gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-slate-800 text-lg">Import Complete</p>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{results.success}</p>
                  <p className="text-xs text-slate-500">Imported</p>
                </div>
                {results.failed > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-rose-500">{results.failed}</p>
                    <p className="text-xs text-slate-500">Failed</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
        {!importing && (
          <Button variant="outline" onClick={handleClose}>
            {results ? 'Close' : 'Cancel'}
          </Button>
        )}
          {!results && !importing && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-[#005f27] hover:bg-[#436a36]"
            >
              Import {preview.length} Parts
              {/* {importing ? `Importing ${importProgress}/${preview.length}...` : `Import ${preview.length} Parts`} */}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}