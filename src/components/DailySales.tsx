import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Calendar, TrendingUp, Package, Tag, IndianRupee, ChevronLeft, ChevronRight } from 'lucide-react';
import VoiceInput from './VoiceInput';

export const DailySales: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void; data: any; onUpdateData: (newData: any) => void; }> = ({ isDark, t, onBack, data, onUpdateData }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', amount: '', qty: 1 });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const salesEvents = data?.salesEvents || [];
  
  const todaysSales = useMemo(() => {
    return salesEvents.filter((e: any) => e.type === 'sale' && e.date.startsWith(selectedDate)).sort((a: any, b: any) => b.ts - a.ts);
  }, [salesEvents, selectedDate]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const totalItemsSold = todaysSales.reduce((acc: number, ev: any) => acc + (ev.qty || 1), 0);

  const handleAddManualSale = () => {
    if (!newItem.title || !newItem.amount) return;
    
    const nowTs = Date.now();
    // Default to a realistic time within the selectedDate for UI consistency
    const eventIso = `${selectedDate}T${new Date().toISOString().split('T')[1]}`;

    const newEvent = {
      id: "manual-" + nowTs,
      ts: nowTs, // keep actual ts for sorting consistency across app, date provides the bucket
      date: eventIso,
      type: 'sale',
      manualTitle: newItem.title,
      manualPrice: Number(newItem.amount),
      qty: newItem.qty || 1
    };

    const newSalesEvents = [...salesEvents, newEvent].slice(-2000);
    onUpdateData({ salesEvents: newSalesEvents });
    setShowAddModal(false);
    setNewItem({ title: '', amount: '', qty: 1 });      if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]);  };

  const handleDeleteSale = (id: string) => {
    if (window.confirm('Remove this sale entry?')) {
      const newSalesEvents = salesEvents.filter((e: any) => e.id !== id);
      onUpdateData({ salesEvents: newSalesEvents });
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getDisplayDateTitle = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate === todayStr) return t("Today's Sales");
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === yesterday.toISOString().split('T')[0]) return t("Yesterday's Sales");

    return new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
      <div className={"min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-300 " + (isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900') + " pb-20"}>
      <div className={"sticky top-0 z-40 px-4 py-3 flex flex-col gap-3 shadow-sm border-b " + (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">{t("Daily Sales Book")}</h1>
          </div>
            <button onClick={() => { if ('vibrate' in navigator) navigator.vibrate(40); setShowAddModal(true); }} className="flex items-center justify-center p-2 bg-[#FF7A18] text-white rounded-full shadow-lg shadow-[#FF7A18]/30 active:scale-95 transition-transform">
            <Plus size={24} />
          </button>
        </div>
        
        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all text-gray-600 dark:text-gray-300">
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex-1 flex items-center justify-center relative">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                if(e.target.value) setSelectedDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <div className="flex items-center gap-2 pointer-events-none">
              <Calendar size={16} className="text-[#FF7A18]" />
              <span className="font-bold text-sm">{getDisplayDateTitle()}</span>
            </div>
          </div>
          
          <button 
            onClick={() => changeDate(1)} 
            disabled={selectedDate === new Date().toISOString().split('T')[0]}
            className={`p-2 rounded-lg transition-all ${selectedDate === new Date().toISOString().split('T')[0] ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={"p-5 rounded-2xl flex flex-col items-center justify-center shadow-lg " + (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100')}>
            <TrendingUp size={24} className="text-[#17B890] mb-2" />
            <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400">Total Revenue</h2>
            <span className="text-xl font-bold mt-1 text-[#17B890]">₹{totalSales.toLocaleString()}</span>
          </div>
          <div className={"p-5 rounded-2xl flex flex-col items-center justify-center shadow-lg " + (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100')}>
            <Package size={24} className="text-[#2F80ED] mb-2" />
            <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400">Items Sold</h2>
            <span className="text-xl font-bold mt-1 text-[#2F80ED]">{totalItemsSold}</span>
          </div>
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
                <div key={sale.id} className={"rounded-xl shadow-sm overflow-hidden transition-all " + (isDark ? 'bg-slate-800' : 'bg-white')}>
                  {/* Card Header (Always Visible) */}
                  <div 
                    onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)} 
                    className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-slate-700"
                  >
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white leading-tight mb-0.5">{title}</h4>
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(sale.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Qty: {sale.qty}
                        {sale.invoiceNo && <span className="ml-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded">Inv #{sale.invoiceNo}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="font-bold text-[#17B890] text-lg leading-tight">₹{total.toLocaleString()}</p>
                      {sale.qty > 1 && <p className="text-[10px] text-gray-400">₹{unitPrice}/ea</p>}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {expandedId === sale.id && (
                    <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-end">
                      <div className="space-y-2 mt-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Transaction Info</span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">Record ID: {sale.id.slice(-8)}</span>
                        </div>
                        {(sale.customerName || sale.customerMobile) && (
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Customer Data</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                              {sale.customerName || 'Walk-in'} {sale.customerMobile ? `• ${sale.customerMobile}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale.id); }} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors flex items-center justify-center">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAddModal(false)}>
          <div className={"p-6 pb-10 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] " + (isDark ? 'bg-slate-900 border-t border-slate-700' : 'bg-white')} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Manual Sale</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200"><ArrowLeft size={20} className="transform rotate-180"/></button>
            </div>
            
            <div className="space-y-4">
              {/* Description Input */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Tag size={12}/> Description / Item Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newItem.title}
                    onChange={e => setNewItem({...newItem, title: e.target.value})}
                    placeholder="e.g. Service Charge"
                    className={"flex-1 p-3 rounded-xl outline-none border border-transparent focus:border-orange-500 transition-colors " + (isDark ? 'bg-slate-800 text-white focus:bg-slate-900 border-slate-700' : 'bg-gray-100 text-gray-900 focus:bg-white border-gray-200')} 
                  />
                  <VoiceInput onResult={(txt) => setNewItem(prev => ({ ...prev, title: txt }))} isDark={isDark} />
                </div>
                {/* Quick Title Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Service', 'Labor Charge', 'Washing', 'Discount', 'Other'].map(tag => (
                    <button key={tag} onClick={() => setNewItem({...newItem, title: tag})} className={`text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95 ${newItem.title === tag ? 'bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' : (isDark ? 'border-slate-700 text-slate-300' : 'border-gray-200 text-gray-600')}`}>{tag}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Amount Input */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><IndianRupee size={12}/> Amount (₹)</label>
                  <input 
                    type="number" 
                    value={newItem.amount}                      onFocus={(e) => e.target.select()}                    onChange={e => setNewItem({...newItem, amount: e.target.value})}
                    placeholder="0.00"
                    className={"w-full p-3 rounded-xl outline-none border border-transparent focus:border-green-500 transition-colors " + (isDark ? 'bg-slate-800 text-white focus:bg-slate-900 border-slate-700' : 'bg-gray-100 text-gray-900 focus:bg-white border-gray-200')} 
                  />
                </div>
                
                {/* Quantity Input */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Package size={12}/> Quantity</label>
                  <div className={"flex items-center justify-between p-1.5 rounded-xl border " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200')}>
                    <button onClick={() => setNewItem({...newItem, qty: Math.max(1, newItem.qty - 1)})} className={"w-8 h-8 rounded-lg flex items-center justify-center font-bold " + (isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-white shadow-sm active:bg-gray-50')}>-</button>
                    <span className="font-bold w-8 text-center">{newItem.qty}</span>
                    <button onClick={() => setNewItem({...newItem, qty: newItem.qty + 1})} className={"w-8 h-8 rounded-lg flex items-center justify-center font-bold " + (isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-white shadow-sm active:bg-gray-50')}>+</button>
                  </div>
                </div>
              </div>

               {/* Quick Amount Tags */}
              <div className="flex flex-wrap gap-2 mt-1">
                  {[50, 100, 200, 500, 1000].map(amt => (
                    <button key={amt} onClick={() => setNewItem({...newItem, amount: amt.toString()})} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all active:scale-95 ${newItem.amount === amt.toString() ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-500/20 dark:text-green-400' : (isDark ? 'border-slate-700 text-slate-300' : 'border-gray-200 text-gray-600')}`}>+₹{amt}</button>
                  ))}
              </div>

              <button 
                onClick={handleAddManualSale}
                className={`w-full py-4 mt-4 text-white rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${(newItem.title && newItem.amount) ? 'bg-[#FF7A18] shadow-[#FF7A18]/30 hover:bg-[#E66A10]' : 'bg-gray-400 dark:bg-slate-700 shadow-none cursor-not-allowed'}`}
                disabled={!newItem.title || !newItem.amount}
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
