import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, 
  Camera, Loader2, Sparkles, Save, Trash2, Plus, Settings, List,
  Mic, Search, Info, Edit, Check
} from 'lucide-react';
import VoiceInput from '../VoiceInput';
import { BarcodeScanner } from './BarcodeScanner';

interface RowData {
  id: string | number;
  name: string;
  category: string;
  qty: number;
  minStock: number;
  sellingPrice: number;
  costPrice: number;
  barcode: string;
  sku: string;
  brand: string;
  supplier: string;
  unit: string;
  _status: 'active' | 'draft' | 'low_stock' | 'out_of_stock' | 'error';
  _errors: string[];
}

const CANONICAL_FIELDS = [
  { key: 'name', label: 'Product Name', req: true },
  { key: 'category', label: 'Category' },
  { key: 'qty', label: 'Current Quantity' },
  { key: 'sellingPrice', label: 'Selling Price (₹)', req: true },
  { key: 'costPrice', label: 'Cost Price (₹)' },
  { key: 'minStock', label: 'Minimum Stock Alert' },
  { key: 'barcode', label: 'Barcode / UPC' },
  { key: 'sku', label: 'SKU' },
  { key: 'brand', label: 'Brand Name' },
  { key: 'supplier', label: 'Supplier / Vendor' },
  { key: 'unit', label: 'Unit (e.g. piece, set)' },
];

export const DataImportExport: React.FC<{ 
  isDark: boolean; 
  t: (key: string) => string; 
  onBack: () => void;
  data?: any;
  onUpdateData?: (newData: any) => void;
}> = ({ isDark, t, onBack, data, onUpdateData }) => {
  const [step, setStep] = useState<'select' | 'manual' | 'mapping' | 'preview' | 'summary' | 'voice' | 'barcode' | 'ocr'>('select');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Import State
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
  const [parsedData, setParsedData] = useState<RowData[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, saved: 0, drafts: 0, errors: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation Engine
  const validateRow = (item: any): RowData => {
    const product = { ...item };
    product.name = product.name?.trim() || '';
    product.category = product.category?.trim() || 'Uncategorized';
    product.unit = product.unit?.trim() || 'piece';
    product.qty = parseFloat(product.qty) || 0;
    product.minStock = parseFloat(product.minStock) || 0;
    product.sellingPrice = parseFloat(product.sellingPrice) || 0;
    product.costPrice = parseFloat(product.costPrice) || 0;

    let status = 'active';
    const errors: string[] = [];

    if (!product.name) {
      status = 'error';
      errors.push('Product name is required');
    }
    if (product.name && !product.sellingPrice) {
      status = 'draft';
      errors.push('No selling price (Saved as Draft)');
    }
    if (status === 'active' && product.qty <= 0) status = 'out_of_stock';
    if (status === 'active' && product.qty > 0 && product.qty <= product.minStock) status = 'low_stock';

    return { ...product, _status: status as any, _errors: errors };
  };

  // --- Auto-Guesser for Headers ---
  const autoMapHeaders = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    headers.forEach(h => {
      const lower = h.toLowerCase().trim();
      if (['name', 'title', 'item', 'product'].some(k => lower.includes(k))) mapping[h] = 'name';
      else if (['cat', 'type'].some(k => lower.includes(k))) mapping[h] = 'category';
      else if (['sell', 'price', 'mrp', 'rate'].some(k => lower.includes(k))) mapping[h] = 'sellingPrice';
      else if (['cost', 'buy', 'purchase'].some(k => lower.includes(k))) mapping[h] = 'costPrice';
      else if (['qty', 'quant', 'stock'].some(k => lower.includes(k))) mapping[h] = 'qty';
      else if (['min', 'alert', 'low'].some(k => lower.includes(k))) mapping[h] = 'minStock';
      else if (['bar', 'upc'].some(k => lower.includes(k))) mapping[h] = 'barcode';
      else if (['sku'].some(k => lower === k)) mapping[h] = 'sku';
      else if (['brand', 'make'].some(k => lower.includes(k))) mapping[h] = 'brand';
      else if (['sup', 'vend'].some(k => lower.includes(k))) mapping[h] = 'supplier';
      else if (['unit', 'uom'].some(k => lower.includes(k))) mapping[h] = 'unit';
    });
    return mapping;
  };

  // --- File Parsing ---
  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) parseFile(e.dataTransfer.files[0]);
  };

  const parseFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTimeout(() => {
        try {
          if (file.name.endsWith('.json')) {
            const json = JSON.parse(text);
            const arr = Array.isArray(json) ? json : [json];
            const formatted = arr.map((item, idx) => validateRow({ ...item, id: Date.now() + idx }));
            setParsedData(formatted);
            setStep('preview');
          } else {
            // Rudimentary CSV Split ignoring commas in quotes
            const lines = text.split('\n').filter(l => l.trim().length > 0);
            if (lines.length < 2) throw new Error("Empty or invalid CSV");
            
            const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const headers = lines[0].split(splitRegex).map(h => h.trim().replace(/^"|"$/g, ''));
            const rows = lines.slice(1).map(l => l.split(splitRegex).map(c => c.trim().replace(/^"|"$/g, '')));
            
            setRawHeaders(headers);
            setRawRows(rows);
            setHeaderMapping(autoMapHeaders(headers));
            setStep('mapping');
          }
        } catch (err) {
          alert('Failed to read file layout. Ensure valid CSV/JSON.');
        }
        setIsProcessing(false);
      }, 600);
    };
    reader.readAsText(file);
  };

  const applyMapping = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const mapped = rawRows.map((row, idx) => {
        const obj: any = { id: Date.now() + idx };
        rawHeaders.forEach((col, colIdx) => {
          const targetKey = headerMapping[col];
          if (targetKey) obj[targetKey] = row[colIdx] || '';
        });
        return validateRow(obj);
      });
      setParsedData(mapped);
      setStep('preview');
      setIsProcessing(false);
    }, 500);
  };

  // --- Inline Edits ---
  const updateField = (id: string | number, field: string, val: any) => {
    setParsedData(prev => prev.map(item => {
      if (item.id === id) {
        return validateRow({ ...item, [field]: val });
      }
      return item;
    }));
  };

  // --- Final Save ---
  const saveToInventory = () => {
    if (!data || !onUpdateData) return;
    setIsProcessing(true);

    const validItems = parsedData.filter(p => p._status !== 'error');
    let existingPages = [...(data.pages || [])];
    let existingEntries = [...(data.entries || [])];
    let existingStockHistory = [...(data.stock_history || [])];

    let drafts = 0;
    
    validItems.forEach(item => {
      if (item._status === 'draft') drafts++;

      const catName = item.category || 'Uncategorized';
      let page = existingPages.find(p => p.itemName?.toLowerCase() === catName.toLowerCase());
      if (!page) {
        page = { id: Date.now() + Math.random(), pageNo: existingPages.length + 1, itemName: catName };
        existingPages.push(page);
      }

      existingEntries.push({
        id: Date.now() + Math.random(),
        pageId: page.id,
        car: item.name,
        qty: item.qty,
        minStock: item.minStock,
        basePrice: item.sellingPrice,
        costPrice: item.costPrice,
        barcode: item.barcode,
        sku: item.sku,
        brand: item.brand,
        supplier: item.supplier,
        unit: item.unit,
        status: item._status,
        created_at: Date.now()
      });

      // Audit Log for stock injection
      existingStockHistory.push({
        itemId: item.name,
        change: item.qty,
        type: 'initial_import',
        date: Date.now(),
        by: 'Admin'
      });
    });

    onUpdateData({ 
      ...data, 
      pages: existingPages, 
      entries: existingEntries,
      stock_history: existingStockHistory 
    });

    setImportStats({ 
      total: parsedData.length, 
      saved: validItems.length - drafts, 
      drafts: drafts, 
      errors: parsedData.length - validItems.length 
    });
    
    setTimeout(() => {
      setIsProcessing(false);
      setStep('summary');
    }, 800);
  };

  const exportScannedVehicles = () => {
    const scans = data?.scannedVehicles || [];
    if (!scans.length) {
      alert('No scanned vehicles to export.');
      return;
    }
    const csvRows = [["Reg No", "Customer Name", "Phone", "Scanned At"]];
    scans.forEach((s: any) => {
      csvRows.push([
        `"${s.regNo || ''}"`,
        `"${s.customerName || ''}"`,
        `"${s.customerPhone || ''}"`,
        `"${new Date(s.scannedAt).toLocaleString()}"`
      ]);
    });
    const csvString = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Autonex_Scanned_Vehicles_${Date.now()}.csv`;
    a.click();
  };

  // ---------------- UI RENDERERS ----------------

  const renderOCR = () => {
    return (
      <div className="max-w-2xl mx-auto py-10 flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-black mb-2">Smart Bill OCR</h2>
        <p className="opacity-70 mb-8 max-w-md">Upload a picture of a supplier invoice, and we will extract the item names, prices, and quantities.</p>
        
        <div className={`w-full max-w-md border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/50 cursor-pointer hover:border-orange-500`}>
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center mb-4 shadow">
              <Camera size={32} />
            </div>
            <strong className="text-lg">Click to Upload Image</strong>
            <span className="text-sm opacity-60 mt-1">JPG, PNG, WebP supported</span>
            
            <input type="file" accept="image/*" className="hidden" id="ocr-upload" onChange={(e) => {
               if(e.target.files && e.target.files.length > 0) {
                 setIsProcessing(true);
                 setTimeout(() => {
                   // Mock OCR Extracted data
                   setParsedData([
                     validateRow({ id: Date.now() + 1, name: 'Engine Oil Castrol', qty: 10, costPrice: 1000, supplier: 'AutoParts Inc' }),
                     validateRow({ id: Date.now() + 2, name: 'Microfiber Cloth', qty: 50, costPrice: 50, supplier: 'AutoParts Inc' })
                   ]);
                   setStep('preview');
                   setIsProcessing(false);
                 }, 2000);
               }
            }} />
            <button className="mt-6 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg" onClick={() => document.getElementById('ocr-upload')?.click()}>
              Choose Image
            </button>
        </div>
        <button onClick={() => setStep('select')} className="mt-8 px-6 py-2 border rounded-xl opacity-70 hover:opacity-100">Cancel</button>
      </div>
    );
  };



  const renderVoice = () => (
    <div className="max-w-xl mx-auto py-10 flex flex-col items-center text-center space-y-6">
       <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mb-2 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
         <Mic size={48} className="animate-pulse" />
       </div>
       <h2 className="text-3xl font-black">AI Voice Inventory</h2>
       <p className="opacity-70">
         Speak clearly. Mention the <b>product name</b>, <b>quantity</b>, and <b>price</b>.<br/>
         <i>"Add 50 boxes of Castrol Engine Oil at 1200 rupees"</i>
       </p>

       <div className="mt-8 p-6 rounded-3xl border w-full max-w-md bg-white dark:bg-slate-800 dark:border-slate-700 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-50" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <VoiceInput
              isDark={isDark}
              onResult={(text) => {
                setIsProcessing(true);
                // Simple regex extraction for demo
                setTimeout(() => {
                   let qty = 1;
                   let price = 0;
                   let name = text;
                   
                   const qtyMatch = text.match(/(\d+)\s*(pieces|boxes|units|items)?/i);
                   if(qtyMatch) qty = parseInt(qtyMatch[1], 10);
                   
                   const priceMatch = text.match(/(?:at|for|rupees|rs)\s*(\d+)/i);
                   if(priceMatch) price = parseInt(priceMatch[1], 10);

                   // Remove quantities and prices from name
                   name = name.replace(/(\d+)\s*(pieces|boxes|units|items)?/ig, '')
                              .replace(/(?:at|for|rupees|rs)\s*(\d+).*/ig, '')
                              .replace(/add/ig, '').trim();

                   const newRow = validateRow({ id: Date.now(), name, qty, sellingPrice: price });
                   setParsedData([newRow]);
                   setStep('preview');
                   setIsProcessing(false);
                }, 1000);
              }}
            />
            <p className="text-sm mt-4 font-medium opacity-60">Tap mic to start</p>
          </div>
       </div>

       <button onClick={() => setStep('select')} className="mt-4 px-6 py-2 border rounded-xl opacity-70 hover:opacity-100">Cancel</button>
    </div>
  );



  const renderBarcode = () => (
    <div className="max-w-2xl mx-auto py-6 flex flex-col items-center">
       <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
         <Camera /> Scan Barcode/SKU
       </h2>
       <p className="opacity-70 mb-6 text-center">Scan a product to quickly add it to inventory.</p>

       <div className="w-full max-w-md h-64 bg-black rounded-2xl overflow-hidden relative shadow-xl border border-slate-700">
           <BarcodeScanner 
              onScan={(scanned) => {
                 setParsedData([validateRow({ id: Date.now(), name: 'Scanned Item', barcode: scanned, qty: 1 })]);
                 setStep('preview');
              }}
              onClose={() => setStep('select')}
           />
       </div>

       <button onClick={() => setStep('select')} className="mt-8 px-6 py-2 border rounded-xl opacity-70 hover:opacity-100">Cancel</button>
    </div>
  );


  
  const renderMethodSelect = () => (
    <div className="max-w-4xl mx-auto py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. bulk file upload */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
            : isDark ? 'border-slate-700 bg-slate-800/40 hover:border-blue-400' : 'border-slate-300 bg-white hover:border-blue-400'
        }`}
      >
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <UploadCloud size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">Bulk Import (CSV / Excel)</h3>
        <p className="text-sm opacity-70 mb-6 px-4">Upload a spreadsheet of your inventory. We accurately auto-map columns and check for issues.</p>
        
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.json" onChange={handleFileUpload} />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <FileSpreadsheet size={18} /> Select File
        </button>
      </div>

      {/* 2. Manual Form */}
      <div 
        onClick={() => {
            setParsedData([validateRow({ id: Date.now() })]); 
            setStep('preview');
        }}
        className={`border-2 border-transparent rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm ${
          isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'
        }`}
      >
        <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mb-4">
          <List size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">Manual Entry</h3>
        <p className="text-sm opacity-70 mb-6 px-4">Type in a single product rapidly with our smart auto-filling form.</p>
        <div className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">Open Form <ArrowLeft className="rotate-180" size={16}/></div>
      </div>

      {/* 3. Camera / Scanner */}
      <div 
        onClick={() => setStep('barcode')}
        className={`border-2 border-transparent rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm ${
          isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'
      }`}>
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-full flex items-center justify-center mb-4">
          <Camera size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">Scan & Fetch</h3>
        <p className="text-sm px-4 mb-2">Scan a standard Barcode and automatically download product details from internet.</p>
        <div className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1">Open Camera <ArrowLeft className="rotate-180" size={16}/></div>
      </div>

      {/* 4. Voice Agent */}
      <div 
        onClick={() => setStep('voice')}
        className={`border-2 border-transparent rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm ${
          isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'
      }`}>
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mb-4">
          <Mic size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">AI Voice Add</h3>
        <p className="text-sm px-4 mb-2">"Add 10 seat covers at 2500 rupees" - AI drops it into inventory directly.</p>
        <div className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">Start Dictation <ArrowLeft className="rotate-180" size={16}/></div>
      </div>
      
      {/* 5. OCR Bill Upload */}
      <div 
        onClick={() => setStep('ocr')}
        className={`border-2 border-transparent rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm md:col-span-2 ${
          isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'
      }`}>
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center mb-4">
          <Sparkles size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">OCR Invoice Scanner (Auto-Extract)</h3>
        <p className="text-sm px-4 mb-2 max-w-lg">Upload an image or PDF of a vendor bill. Our AI will automatically extract all products, quantities, and prices, matching them into your inventory.</p>
        <div className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1">Upload Bill Image <ArrowLeft className="rotate-180" size={16}/></div>
      </div>

      {/* 6. Export Scanned Vehicles */}
      <div
        onClick={exportScannedVehicles}
        className={`border-2 border-transparent rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm md:col-span-2 ${
          isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'
      }`}
      >
        <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-full flex items-center justify-center mb-4">
          <Save size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">Export Scanned Vehicles</h3>
        <p className="text-sm px-4 mb-2 max-w-lg">Download all OCR vehicle scans as CSV for reporting or backups.</p>
        <div className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">Download CSV <ArrowLeft className="rotate-180" size={16}/></div>
      </div>
    </div>
  );


  const renderMapping = () => (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
       <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-2"><Settings className="text-blue-500"/> Map File Columns</h3>
          <p className="text-sm opacity-70 mb-6">We've guessed the column headers. Please correct any mismatches so the inventory registers properly.</p>
          
          <div className="space-y-3">
             {rawHeaders.map((header, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                   <div className="font-medium">{header}</div>
                   <ArrowLeft className="rotate-180 opacity-30" size={16}/>
                   <select 
                     value={headerMapping[header] || ''}
                     onChange={(e) => setHeaderMapping(prev => ({...prev, [header]: e.target.value}))}
                     className={`w-48 p-2 text-sm rounded border outline-none ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}
                   >
                     <option value="">-- Ignore --</option>
                     {CANONICAL_FIELDS.map(cf => (
                       <option key={cf.key} value={cf.key}>{cf.label} {cf.req ? '*' : ''}</option>
                     ))}
                   </select>
                </div>
             ))}
          </div>
       </div>

       <button onClick={applyMapping} className="w-full py-4 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2">
         {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle />} Validate Data
       </button>
    </div>
  );

  const renderPreview = () => (
    <div className="flex flex-col h-full overscroll-none pb-24">
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-800/50">
        <div>
          <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <Sparkles size={18}/> Review & Edit
          </h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 opacity-80 mt-1">
             Rows missing details are marked as warnings. Fix errors (red) or they will not be imported.
          </p>
        </div>
        <button onClick={() => setParsedData(prev => [validateRow({ id: Date.now() }), ...prev])} 
           className="btn text-blue-700 bg-white dark:bg-slate-800 py-1.5 px-3 rounded-lg text-sm font-bold shadow-sm flex items-center gap-1">
          <Plus size={16} /> Add Row
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className={`text-[11px] uppercase tracking-wider opacity-60 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <th className="p-3 w-10">Sts</th>
              <th className="p-3 w-64">Product Name*</th>
              <th className="p-3">Category</th>
              <th className="p-3 w-24">Qty</th>
              <th className="p-3 w-32">Sell Price*</th>
              <th className="p-3 w-32">Cost Price</th>
              <th className="p-3">Barcode/SKU</th>
              <th className="p-3 w-12 flex justify-center">Del</th>
            </tr>
          </thead>
          <tbody>
            {parsedData.map((item, idx) => {
              const hasError = item._status === 'error';
              const isDraft = item._status === 'draft';
              
              return (
              <tr key={item.id} className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} ${hasError ? (isDark ? 'bg-red-900/10' : 'bg-red-50') : isDraft ? (isDark ? 'bg-yellow-900/10' : 'bg-yellow-50') : ''}`}>
                <td className="p-2">
                  {hasError ? <div title={item._errors.join(', ')} className="w-4 h-4 bg-red-500 rounded-full animate-pulse" /> : 
                   isDraft ? <div title="Missing Price (Draft)" className="w-4 h-4 bg-yellow-500 rounded-full" /> : 
                   <div title="Active Ready" className="w-4 h-4 bg-green-500 rounded-full" />}
                </td>
                <td className="p-2">
                  <input type="text" value={item.name} 
                    onChange={e => updateField(item.id, 'name', e.target.value)} 
                    placeholder="Required"
                    className={`w-full bg-transparent border-b outline-none text-sm p-1 ${!item.name ? 'border-red-500' : 'border-transparent focus:border-blue-500'}`} />
                </td>
                <td className="p-2">
                  <input type="text" value={item.category} onChange={e => updateField(item.id, 'category', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm p-1" />
                </td>
                <td className="p-2">
                  <input type="number" value={item.qty} onChange={e => updateField(item.id, 'qty', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm p-1 font-mono" />
                </td>
                <td className="p-2">
                  <div className="flex items-center">
                    <span className="opacity-50 text-xs mr-1">₹</span>
                    <input type="number" value={item.sellingPrice || ''} onChange={e => updateField(item.id, 'sellingPrice', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm p-1 font-mono" />
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center">
                    <span className="opacity-50 text-xs mr-1">₹</span>
                    <input type="number" value={item.costPrice || ''} onChange={e => updateField(item.id, 'costPrice', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm p-1 font-mono hover:opacity-100" />
                  </div>
                </td>
                <td className="p-2">
                  <input type="text" value={item.barcode || item.sku || ''} onChange={e => updateField(item.id, 'barcode', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm p-1 font-mono" placeholder="Scan/Type" />
                </td>
                <td className="p-2 flex justify-center text-red-400 hover:text-red-500 cursor-pointer pt-3" onClick={() => setParsedData(prev => prev.filter(p => p.id !== item.id))}>
                  <Trash2 size={16} />
                </td>
              </tr>
            )})}
            {parsedData.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 opacity-50 font-bold">No products to evaluate. Go back or Add Row.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex justify-between`}>
          <button onClick={() => setStep('select')} className="px-6 py-3 font-bold rounded-xl border opacity-70 hover:opacity-100 transition-colors">Discard</button>
          
          <button onClick={saveToInventory} disabled={parsedData.length === 0 || isProcessing} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50">
            {isProcessing ? <Loader2 className="animate-spin"/> : <Check />} 
            Import & Save Inventory
          </button>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="max-w-2xl mx-auto py-10 flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={48} />
      </div>
      <h2 className="text-3xl font-black mb-2">Import Successful!</h2>
      <p className="opacity-70 mb-8 max-w-md">Your database schema has been securely updated. Draft items will not be visible for billing until priced.</p>

      <div className="grid grid-cols-3 gap-4 w-full mb-8">
         <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
           <div className="text-3xl font-black text-green-500">{importStats.saved}</div>
           <div className="text-xs font-bold uppercase opacity-50 mt-1">Fully Active</div>
         </div>
         <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
           <div className="text-3xl font-black text-yellow-500">{importStats.drafts}</div>
           <div className="text-xs font-bold uppercase opacity-50 mt-1">Draft state</div>
         </div>
         <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
           <div className="text-3xl font-black text-red-500">{importStats.errors}</div>
           <div className="text-xs font-bold uppercase opacity-50 mt-1">Failed / Skipped</div>
         </div>
      </div>

      <button onClick={onBack} className="w-full py-4 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition">
        Return to Dashboard
      </button>
    </div>
  );

  // Overlay processing state globally
  return (
    <div className={`absolute inset-0 z-40 flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`flex items-center px-4 py-4 ${isDark ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-200'}`}>
        <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold">{t('Inventory Setup & Hub')}</h2>
          <p className="text-[10px] uppercase font-black tracking-widest text-blue-500 opacity-80">Enterprise Management System</p>
        </div>
      </div>

      <div className="flex-1 relative overflow-y-auto w-full">
        {step === 'select' && renderMethodSelect()}
        {step === 'mapping' && renderMapping()}
        {step === 'preview' && renderPreview()}
        {step === 'summary' && renderSummary()}
        {step === 'voice' && renderVoice()}
        {step === 'barcode' && renderBarcode()}
        {step === 'ocr' && renderOCR()}

        {isProcessing && step !== 'preview' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
             <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col items-center">
                 <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                 <span className="font-bold">Analyzing Dataset...</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
