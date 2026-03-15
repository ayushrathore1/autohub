import React, { useState } from 'react';
import { Activity, Plus, Package, Trash2, ArrowLeft } from 'lucide-react';

interface StockValueCalculatorProps {
    isDark?: boolean;
    t?: (key: string) => string;
    onBack?: () => void;
}

const StockValueCalculator: React.FC<StockValueCalculatorProps> = ({ isDark = false, t = (k: string) => k, onBack }) => {
    const [stockCalc, setStockCalc] = useState<{ items: any[], newItem: any }>({ items: [], newItem: { name: '', qty: 0, rate: 0 } });

    // Native App Styles
    const cardClass = `h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`;

    const stockTotal = stockCalc.items.reduce((acc: number, item: any) => acc + (item.qty * item.rate), 0);

    return (
        <div className={cardClass}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                {onBack && (
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />
                    </button>
                )}
                <h3 className="font-bold text-xl flex items-center gap-2">
                    <Activity className="text-cyan-500" size={24} />
                    {t('Stock Value')}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl p-6 text-white shadow-xl shadow-cyan-500/20 mb-6 flex flex-col items-center justify-center">
                    <span className="text-cyan-100 font-bold tracking-wider mb-1">TOTAL INVENTORY</span>
                    <span className="text-4xl font-black">₹{stockTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-cyan-100 dark:border-slate-700 overflow-hidden mb-6 flex-shrink-0">
                    <div className="p-3 bg-cyan-50 dark:bg-slate-700 border-b border-cyan-100 dark:border-slate-600 font-bold text-cyan-800 dark:text-cyan-200 text-sm flex items-center gap-2">
                        <Plus size={16} /> Add Inventory Fast
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                        <input
                            className="col-span-2 w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 font-bold text-sm outline-none"
                            placeholder="Part Name / SKU"
                            value={stockCalc.newItem.name}
                            onChange={e => setStockCalc({ ...stockCalc, newItem: { ...stockCalc.newItem, name: e.target.value } })}
                        />
                        <input
                            type="number"
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 font-bold text-sm outline-none"
                            placeholder="Qty"
                            value={stockCalc.newItem.qty || ''}
                            onChange={e => setStockCalc({ ...stockCalc, newItem: { ...stockCalc.newItem, qty: Number(e.target.value) } })}
                        />
                        <input
                            type="number"
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 font-bold text-sm outline-none"
                            placeholder="Purchase Rate"
                            value={stockCalc.newItem.rate || ''}
                            onChange={e => setStockCalc({ ...stockCalc, newItem: { ...stockCalc.newItem, rate: Number(e.target.value) } })}
                        />
                        <button
                            className="col-span-2 p-3 bg-cyan-600 hover:bg-cyan-700 active:scale-95 transition-all text-white rounded-xl font-bold shadow-md"
                            onClick={() => {
                                if (stockCalc.newItem.name && stockCalc.newItem.qty > 0) {
                                    setStockCalc({
                                        items: [...stockCalc.items, { ...stockCalc.newItem, id: Date.now() }],
                                        newItem: { name: '', qty: 0, rate: 0 }
                                    });
                                }
                            }}
                        >
                            Save to Inventory (Local)
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {stockCalc.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400 dark:text-gray-500 h-full">
                            <Package size={48} className="mb-2 opacity-30" />
                            <p className="font-bold">No Items Added</p>
                        </div>
                    ) : (
                        <div className="space-y-2 pb-4">
                            {stockCalc.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-4 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm animate-in fade-in zoom-in-95">
                                    <div>
                                        <p className="font-bold">{item.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.qty} × ₹{item.rate}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-cyan-600 dark:text-cyan-400">₹{(item.qty * item.rate).toLocaleString('en-IN')}</p>
                                        </div>
                                        <button
                                            onClick={() => setStockCalc({ ...stockCalc, items: stockCalc.items.filter(i => i.id !== item.id) })}
                                            className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockValueCalculator;
