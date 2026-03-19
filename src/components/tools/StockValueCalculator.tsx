import React, { useState, useMemo } from 'react';
import { Activity, Package, ArrowLeft, TrendingUp, AlertCircle, PieChart, Info, DollarSign } from 'lucide-react';

interface StockValueCalculatorProps {
    isDark?: boolean;
    t?: (key: string) => string;
    onBack?: () => void;
    data?: any;
}

const StockValueCalculator: React.FC<StockValueCalculatorProps> = ({ isDark = false, t = (k: string) => k, onBack, data }) => {
    
    // Process real inventory from global data
    const inventoryStats = useMemo(() => {
        let totalCostValue = 0;
        let totalRetailValue = 0;
        let totalItems = 0;
        let outOfStock = 0;
        let lowStock = 0;
        let highValueItems: any[] = [];
        
        const entries = data?.entries || [];

        entries.forEach((item: any) => {
            const qty = parseFloat(item.qty) || 0;
            const cost = parseFloat(item.costPrice) || 0;
            const retail = parseFloat(item.basePrice) || parseFloat(item.sellingPrice) || 0;
            const minStock = parseFloat(item.minStock) || 0;
            
            if (qty <= 0) {
               outOfStock++;
               return; // No value to add
            }

            totalItems += qty;
            
            // If cost price is missing, fallback to 70% of retail price as an estimate
            const actualCost = cost > 0 ? cost : (retail * 0.7);
            
            const itemCostValue = qty * actualCost;
            const itemRetailValue = qty * retail;

            totalCostValue += itemCostValue;
            totalRetailValue += itemRetailValue;

            if (qty > 0 && qty <= minStock) {
                lowStock++;
            }

            highValueItems.push({
                ...item,
                costValue: itemCostValue,
                retailValue: itemRetailValue,
                actualCost
            });
        });

        highValueItems.sort((a, b) => b.costValue - a.costValue);

        return {
            totalCostValue,
            totalRetailValue,
            expectedProfit: totalRetailValue - totalCostValue,
            margin: totalCostValue > 0 ? ((totalRetailValue - totalCostValue) / totalCostValue) * 100 : 0,
            totalItems,
            outOfStock,
            lowStock,
            topItems: highValueItems.slice(0, 10)
        };
    }, [data]);

    const cardClass = `h-full flex flex-col ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`;

    return (
        <div className={cardClass}>
            {/* Header */}
            <div className={`flex items-center px-4 py-4 border-b shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                {onBack && (
                    <button onClick={onBack} className={`p-2 -ml-2 mr-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                        <ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />
                    </button>
                )}
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                      <Activity className="text-blue-500" size={24} />
                      {t('Stock Valuation')}
                  </h2>
                  <p className="text-[10px] uppercase font-black tracking-widest text-blue-500 opacity-80">Real-Time Analytics</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-6 pb-24">
                
                {/* Hero Stat */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <PieChart size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col">
                        <span className="text-blue-100 font-bold tracking-wider mb-2 text-sm uppercase opacity-80 flex items-center gap-2"><DollarSign size={16}/> Total Inventory Value (Cost)</span>
                        <span className="text-4xl md:text-5xl font-black mb-4">₹{Math.round(inventoryStats.totalCostValue).toLocaleString('en-IN')}</span>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                           <div>
                              <span className="text-xs uppercase opacity-70 font-bold block mb-1">Potential Retail</span>
                              <div className="text-lg font-bold text-green-300">₹{Math.round(inventoryStats.totalRetailValue).toLocaleString('en-IN')}</div>
                           </div>
                           <div>
                              <span className="text-xs uppercase opacity-70 font-bold block mb-1">Expected Profit</span>
                              <div className="text-lg font-bold text-yellow-300">₹{Math.round(inventoryStats.expectedProfit).toLocaleString('en-IN')} (+{inventoryStats.margin.toFixed(1)}%)</div>
                           </div>
                        </div>
                    </div>
                </div>

                {/* Micro Stats */}
                <div className="grid grid-cols-3 gap-3">
                   <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white shadow-sm border-gray-100'} border flex flex-col items-center justify-center text-center`}>
                       <Package className="text-blue-500 mb-2" />
                       <div className="text-2xl font-black">{inventoryStats.totalItems}</div>
                       <div className="text-xs uppercase font-bold opacity-50 mt-1">Units</div>
                   </div>
                   <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white shadow-sm border-gray-100'} border flex flex-col items-center justify-center text-center`}>
                       <TrendingUp className="text-yellow-500 mb-2" />
                       <div className="text-2xl font-black">{inventoryStats.lowStock}</div>
                       <div className="text-xs uppercase font-bold opacity-50 mt-1">Low</div>
                   </div>
                   <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white shadow-sm border-gray-100'} border flex flex-col items-center justify-center text-center`}>
                       <AlertCircle className="text-red-500 mb-2" />
                       <div className="text-2xl font-black">{inventoryStats.outOfStock}</div>
                       <div className="text-xs uppercase font-bold opacity-50 mt-1">Out</div>
                   </div>
                </div>

                {/* Top Valuable Items Table */}
                <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                       <h3 className="font-bold flex items-center gap-2"><TrendingUp size={18} className="text-indigo-500"/> Most Valuable Assets</h3>
                       <div className="flex items-center gap-1 text-xs opacity-60"><Info size={12}/> By Total Cost</div>
                    </div>
                    
                    {inventoryStats.topItems.length === 0 ? (
                        <div className="p-8 text-center opacity-50 font-bold">No inventory data found. Please import stock.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] uppercase font-black opacity-50 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                                        <th className="p-3">Product</th>
                                        <th className="p-3">Qty</th>
                                        <th className="p-3">Avg Cost</th>
                                        <th className="p-3 text-right">Total Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryStats.topItems.map((item, idx) => (
                                        <tr key={item.id || idx} className={`border-b last:border-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                            <td className="p-3">
                                                <div className="font-bold text-sm w-[150px] truncate" title={item.car || item.name}>{item.car || item.name}</div>
                                                <div className="text-xs opacity-60 line-clamp-1">{item.category || item.brand || 'General'}</div>
                                            </td>
                                            <td className="p-3 font-mono text-sm">{item.qty} {item.unit || ''}</td>
                                            <td className="p-3 font-mono text-sm text-slate-500">₹{Math.round(item.actualCost)}</td>
                                            <td className="p-3 font-mono text-sm font-bold text-right text-indigo-500 dark:text-indigo-400">
                                                ₹{Math.round(item.costValue).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="text-center opacity-50 text-xs font-bold px-4">
                   Note: Metrics use item Cost Price. If Cost Price is missing, the system auto-estimates it as 70% of Retail Price for valuation.
                </div>
            </div>
        </div>
    );
};

export default StockValueCalculator;