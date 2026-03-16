import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Calendar, TrendingUp } from 'lucide-react';

export const DailySales: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void; data: any; onUpdateData: (newData: any) => void; }> = ({ isDark, t, onBack, data, onUpdateData }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', amount: '' });

  const salesEvents = data?.salesEvents || [];
  
  const today = new Date().toISOString().split('T')[0];
  const todaysSales = useMemo(() => {
    return salesEvents.filter((e: any) => e.type === 'sale' && e.date.startsWith(today)).sort((a: any, b: any) => b.ts - a.ts);
  }, [salesEvents, today]);

  const totalSales = todaysSales.reduce((acc: number, ev: any) => {
    let price = 0;
    if (ev.manualPrice !== undefined) {
      price = Number(ev.manualPrice);
    } else {
      const entry = (data.entries || []).find((x: any) => x.id === ev.entryId);
      price = entry && entry.sPrice ? Number(entry.sPrice) : 0;
    }
    return acc + (ev.qty * price);
  }, 0);

  const handleAddManualSale = () => {
    if (!newItem.title || !newItem.amount) return;
    
    const nowTs = Date.now();
    const newEvent = {
      id: "manual-" + nowTs,
      ts: nowTs,
      date: new Date().toISOString(),
      type: 'sale',
      manualTitle: newItem.title,
      manualPrice: Number(newItem.amount),
      qty: 1
    };

    const newSalesEvents = [...salesEvents, newEvent].slice(-2000);
    onUpdateData({ salesEvents: newSalesEvents });
    setShowAddModal(false);
    setNewItem({ title: '', amount: '' });
  };

  const handleDeleteSale = (id: string) => {
    if (window.confirm('Remove this sale entry?')) {
      const newSalesEvents = salesEvents.filter((e: any) => e.id !== id);
      onUpdateData({ salesEvents: newSalesEvents });
    }
  };

  return (
    <div className={"min-h-screen " + (isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900') + " pb-20"}>
      <div className={"sticky top-0 z-40 px-4 py-4 flex items-center justify-between shadow-sm border-b " + (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200')}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">{t("Today's Sales")}</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center p-2 bg-[#FF7A18] text-white rounded-full shadow-lg shadow-[#FF7A18]/30">
          <Plus size={24} />
        </button>
      </div>

      <div className="p-4">
        <div className={"p-5 rounded-2xl mb-6 flex flex-col items-center justify-center shadow-lg " + (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100')}>
          <TrendingUp size={32} className="text-[#17B890] mb-2" />
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400">Total Revenue</h2>
          <span className="text-3xl font-bold mt-1">₹{totalSales.toLocaleString()}</span>
        </div>

        <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Sale Entries ({todaysSales.length})</h3>

        {todaysSales.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <Calendar size={48} className="mx-auto mb-3" />
            <p>No sales recorded today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysSales.map((sale: any) => {
              let title = sale.manualTitle || 'Unknown Item';
              let unitPrice = sale.manualPrice || 0;
              let isManual = !!sale.manualTitle;

              if (!isManual) {
                const entry = (data.entries || []).find((x: any) => x.id === sale.entryId);
                if (entry) {
                  title = entry.itemName || entry.partNo || 'Item';
                  unitPrice = Number(entry.sPrice) || 0;
                }
              }

              const total = unitPrice * sale.qty;

              return (
                <div key={sale.id} className={"p-4 rounded-xl flex items-center justify-between shadow-sm " + (isDark ? 'bg-slate-800' : 'bg-white')}>
                  <div>
                    <h4 className="font-bold text-base">{title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{new Date(sale.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Qty: {sale.qty}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-[#17B890]">₹{total.toLocaleString()}</p>
                      {sale.qty > 1 && <p className="text-xs text-gray-500">₹{unitPrice}/ea</p>}
                    </div>
                    <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={"p-6 rounded-t-3xl " + (isDark ? 'bg-slate-900 border-t border-slate-700' : 'bg-white')}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Manual Sale</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2"><ArrowLeft size={24} className="transform rotate-180"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Description / Item Name</label>
                <input 
                  type="text" 
                  value={newItem.title}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                  placeholder="e.g. Service Charge"
                  className={"w-full p-3 rounded-xl outline-none " + (isDark ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-900')} 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Amount (₹)</label>
                <input 
                  type="number" 
                  value={newItem.amount}
                  onChange={e => setNewItem({...newItem, amount: e.target.value})}
                  placeholder="0.00"
                  className={"w-full p-3 rounded-xl outline-none " + (isDark ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-900')} 
                />
              </div>
              <button 
                onClick={handleAddManualSale}
                className="w-full py-3.5 mt-2 bg-[#FF7A18] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#FF7A18]/30 active:scale-95 transition-all"
              >
                Save Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
