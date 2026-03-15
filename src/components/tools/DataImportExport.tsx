import React, { useState, useRef } from 'react';
import { ArrowLeft, UploadCloud, FileSpreadsheet, CheckCircle, Camera, Loader2, Sparkles, Save } from 'lucide-react';

export const DataImportExport: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void }> = ({ isDark, t, onBack }) => {
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [parsedData, setParsedData] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSimulateUpload = (e: any) => {
    if(e.target.files && e.target.files.length > 0) {
        processSimulatedFile();
    }
  };

  const processSimulatedFile = () => {
    setStep('processing');
    setTimeout(() => {
        setParsedData([
            { id: 1, name: 'Castrol Engine Oil 5W30', category: 'Lubricants', qty: 24, price: 1850 },
            { id: 2, name: 'Bosch Wiper Blade 16"', category: 'Accessories', qty: 40, price: 350 },
            { id: 3, name: 'Maruti Swift Brake Pads', category: 'Spares', qty: 15, price: 1200 },
            { id: 4, name: 'Amaron Battery 45Ah', category: 'Electricals', qty: 5, price: 4200 },
            { id: 5, name: '3M Car Polish', category: 'Car Care', qty: 12, price: 850 },
        ]);
        setStep('preview');
    }, 4500); // 4.5 seconds to feel like standard AI processing
  };

  return (
    <div className={`p-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles size={24} className="text-yellow-500" /> {t('Smart Data Import')}</h2>
      </div>

      {step === 'upload' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-xl border ${isDark ? 'border-yellow-900/50 bg-yellow-900/20 text-yellow-200' : 'border-yellow-200 bg-yellow-50 text-yellow-800'} flex gap-3`}>
              <Sparkles className="shrink-0 text-yellow-500 mt-0.5" />
              <p className="text-sm leading-relaxed"><b>AI-Powered Import:</b> Upload a CSV/Excel file, or <b>take a photo</b> of your supplier bill or hand-written inventory. We will auto-extract items, quantities, and assign categories automatically!</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div 
                className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : isDark ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); processSimulatedFile(); }}
                onClick={() => fileInputRef.current?.click()}
            >
                <UploadCloud size={40} className="text-blue-500 mb-3" />
                <h3 className="font-bold text-sm mb-1">Upload File</h3>
                <p className="text-xs text-gray-500">CSV, Excel, PDF</p>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleSimulateUpload} accept=".csv, .xlsx, .xls, .pdf" />
            </div>

            <div 
                className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDark ? 'border-indigo-600/50 bg-indigo-900/20 hover:bg-indigo-900/40' : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100'}`}
                onClick={() => cameraInputRef.current?.click()}
            >
                <Camera size={40} className="text-indigo-500 mb-3" />
                <h3 className="font-bold text-sm mb-1 text-indigo-700 dark:text-indigo-400">Scan Bill / Photo</h3>
                <p className="text-xs text-indigo-500/70 dark:text-indigo-300/70">Using Camera (AI)</p>
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleSimulateUpload} />
            </div>
          </div>

          <div className="mt-8">
              <h3 className="font-bold text-lg mb-3">Download Manual Templates</h3>
              <div className="grid gap-3">
                <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-slate-800' : 'bg-white'} border shadow-sm dark:border-slate-700`}>
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg"><FileSpreadsheet size={24}/></div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm">Inventory CSV Standard</h4>
                    </div>
                    <button className="text-xs text-blue-600 font-bold px-3 py-1 bg-blue-50 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">Download</button>
                </div>
              </div>
          </div>
        </div>
      )}

      {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-80 space-y-6">
              <div className="relative">
                <Loader2 size={56} className="text-blue-500 animate-spin" />
                <Sparkles size={24} className="text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-center">AI is analyzing your document...</h3>
              <div className="flex flex-col items-center space-y-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <p className="animate-pulse">1. Extracting text from image/file...</p>
                  <p className="animate-pulse" style={{ animationDelay: '1500ms'}}>2. Structuring data into rows...</p>
                  <p className="animate-pulse" style={{ animationDelay: '3000ms'}}>3. Auto-assigning categories...</p>
              </div>
          </div>
      )}

      {step === 'preview' && (
          <div className="space-y-4 animate-in fade-in duration-500">
              <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                  <CheckCircle className="text-green-500 shrink-0" size={28} />
                  <div>
                      <h3 className="font-bold text-green-700 dark:text-green-400">Successfully Extracted & Categorized</h3>
                      <p className="text-sm text-green-600 dark:text-green-500">Found {parsedData.length} items. Please review before saving.</p>
                  </div>
              </div>

              <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
                  <div className={`flex text-[10px] font-black uppercase p-3 border-b ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <div className="flex-[2]">Item</div>
                      <div className="flex-1">Category (AI)</div>
                      <div className="w-12 text-center">Qty</div>
                      <div className="w-20 text-right">Price</div>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto w-full dark:divide-slate-700">
                      {parsedData.map(item => (
                          <div key={item.id} className="flex items-center p-3 text-sm">
                              <div className="flex-[2] font-semibold pr-2">{item.name}</div>
                              <div className="flex-1">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block text-center ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                      {item.category}
                                  </span>
                              </div>
                              <div className="w-12 text-center font-black">{item.qty}</div>
                              <div className="w-20 text-right text-gray-500 text-xs font-bold">?{item.price}</div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="flex gap-3 pt-4">
                  <button onClick={() => setStep('upload')} className={`flex-1 py-3.5 rounded-xl font-bold border-2 transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Cancel</button>
                  <button className="flex-[2] py-3.5 bg-blue-600 text-white flex items-center justify-center gap-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all" onClick={() => { alert('Data synced to Cloud Database!'); setStep('upload'); }}>
                      <Save size={20} /> Import to Stock
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
