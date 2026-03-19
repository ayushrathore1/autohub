import VoiceInput from '../VoiceInput';
﻿import React, { useState, useMemo } from 'react';
import { ArrowLeft, BookOpen, Search, Plus, Filter, ArrowUpRight, ArrowDownRight, User, Phone, MapPin, ChevronRight, X, Calendar, Download } from 'lucide-react';

interface SupplierHistory {
  id: number;
  date: string;
  amount: number;
  type: 'paid' | 'received';
  note: string;
}

interface Supplier {
  id: number;
  name: string;
  phone: string;
  balance: number;
  lastTxn: string;
  status: 'to-pay' | 'to-receive' | 'settled';
  history?: SupplierHistory[];
}

export const SupplierLedger: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void; data?: any; onUpdateData?: (newData: any) => void; }> = ({ isDark, t, onBack, data, onUpdateData }) => {
  const suppliers = data?.supplierLedger || [];
  const setSuppliers = (newSuppliers: Supplier[]) => {
      if (onUpdateData) {
          onUpdateData({ supplierLedger: newSuppliers });
      }
  };

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', initialBalance: '' });

  const [txnType, setTxnType] = useState<'paid'|'received'>('paid');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnNote, setTxnNote] = useState('');

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
      const matchFilter = filter === 'all' || s.status === filter;
      return matchSearch && matchFilter;
    });
  }, [search, filter, suppliers]);

  const addSupplier = () => {
      if(newSupplier.name && newSupplier.phone) {
          const bal = parseFloat(newSupplier.initialBalance) || 0;
          setSuppliers([...suppliers, {
              id: Date.now(),
              ...newSupplier,
              balance: bal,
              lastTxn: new Date().toISOString().split('T')[0],
              status: bal < 0 ? 'to-pay' : bal > 0 ? 'to-receive' : 'settled',
              history: bal !== 0 ? [{ id: Date.now(), date: new Date().toISOString().split('T')[0], amount: bal, type: bal < 0 ? 'paid' : 'received', note: 'Opening Balance'}] : []
          }]);
          setIsAddSupplierOpen(false);
          setNewSupplier({ name: '', phone: '', initialBalance: ''});
      }
  };

  const handleTxn = () => {
      if(selectedSupplierId && txnAmount && parseFloat(txnAmount) > 0) {
          const amount = parseFloat(txnAmount);
          const adjAmount = txnType === 'paid' ? -amount : amount;

          setSuppliers(suppliers.map(s => {
              if (s.id === selectedSupplierId) {
                  const newBalance = s.balance + adjAmount;
                  const newHistory = [{
                      id: Date.now(),
                      date: new Date().toISOString().split('T')[0],
                      amount: adjAmount,
                      type: txnType,
                      note: txnNote || (txnType==='paid' ? 'Payment given' : 'Goods/Payment returned')
                  }, ...(s.history || [])];

                  return {
                      ...s,
                      balance: newBalance,
                      lastTxn: new Date().toISOString().split('T')[0],
                      status: newBalance < 0 ? 'to-pay' : newBalance > 0 ? 'to-receive' : 'settled',
                      history: newHistory
                  };
              }
              return s;
          }));
          setTxnAmount('');
          setTxnNote('');
      }
  };

  const totalToPay = suppliers.filter(s => s.balance < 0).reduce((acc, curr) => acc + Math.abs(curr.balance), 0);
  const totalToReceive = suppliers.filter(s => s.balance > 0).reduce((acc, curr) => acc + curr.balance, 0);

  if (selectedSupplier) {
      return (
        <div className={`p-4 h-full flex flex-col ${isDark ? 'text-white bg-slate-900' : 'text-gray-900 bg-gray-50'}`}>
          <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setSelectedSupplierId(null)} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full">
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h2 className="text-xl font-bold">{selectedSupplier.name}</h2>
                  <p className="text-sm font-medium text-gray-500">{selectedSupplier.phone}</p>
              </div>
          </div>

          <div className={`p-5 rounded-2xl mb-6 shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} text-center`}>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-1">Total Balance</p>
              <h3 className={`text-4xl font-black ${selectedSupplier.balance < 0 ? 'text-red-500' : selectedSupplier.balance > 0 ? 'text-emerald-500' : 'text-gray-500'}`}>
                  ₹{Math.abs(selectedSupplier.balance).toLocaleString()}
              </h3>
              <p className="text-sm mt-1 font-medium text-gray-400">
                  {selectedSupplier.balance < 0 ? 'You have to pay' : selectedSupplier.balance > 0 ? 'You will receive' : 'Settled cleared'}
              </p>
          </div>

          <div className={`mb-6 p-4 rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg p-1.5 mb-4">
                  <button onClick={() => setTxnType('paid')} className={`flex-1 py-2 font-bold text-sm rounded flex items-center justify-center gap-1 transition-all ${txnType==='paid' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}><ArrowUpRight size={16}/> Paid Out</button>
                  <button onClick={() => setTxnType('received')} className={`flex-1 py-2 font-bold text-sm rounded flex items-center justify-center gap-1 transition-all ${txnType==='received' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500'}`}><ArrowDownRight size={16}/> Items In</button>
              </div>
              <input type="number" className={`w-full p-4 text-center text-3xl font-black rounded-xl mb-3 border ${isDark ? 'bg-slate-900 border-slate-700 placeholder-slate-700' : 'bg-gray-50 border-gray-200'}`} placeholder="₹ 0" value={txnAmount} onChange={e=>setTxnAmount(e.target.value)} />
              <input className={`w-full p-3 font-medium rounded-xl mb-3 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`} placeholder="Note (Optional)" value={txnNote} onChange={e=>setTxnNote(e.target.value)} />
              <button onClick={handleTxn} className={`w-full py-4 text-white font-black text-lg rounded-xl shadow-lg transition-transform active:scale-95 ${txnType==='paid' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>Save Transaction</button>
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
              <h4 className="font-black text-lg mb-3 px-1">Transaction History</h4>
              <div className="space-y-3">
                  {(selectedSupplier.history || []).map(h => (
                      <div key={h.id} className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                          <div>
                              <p className="font-bold">{h.note}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Calendar size={12}/> {h.date}</p>
                          </div>
                          <div className={`font-black text-lg ${h.type === 'paid' ? 'text-red-500' : 'text-emerald-500'}`}>
                              {h.type === 'paid' ? '-' : '+'}₹{Math.abs(h.amount).toLocaleString()}
                          </div>
                      </div>
                  ))}
                  {(!selectedSupplier.history || selectedSupplier.history.length === 0) && (
                      <div className="text-center p-6 text-gray-400 font-medium">No transactions yet</div>
                  )}
              </div>
          </div>
        </div>
      );
  }

  return (
    <div className={`p-4 h-full flex flex-col ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="text-purple-500" /> {t('Supplier Ledger')}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`p-4 rounded-2xl flex flex-col justify-center border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-100'} shadow-sm`}>
              <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs uppercase tracking-wide mb-1"><ArrowUpRight size={14}/> To Pay</div>
              <div className="text-2xl font-black text-red-500">₹{totalToPay.toLocaleString()}</div>
          </div>
          <div className={`p-4 rounded-2xl flex flex-col justify-center border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-100'} shadow-sm`}>
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs uppercase tracking-wide mb-1"><ArrowDownRight size={14}/> To Receive</div>
              <div className="text-2xl font-black text-emerald-500">₹{totalToReceive.toLocaleString()}</div>
          </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                className={`w-full pl-10 p-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-purple-500' : 'bg-gray-50 border-gray-300 focus:border-purple-500'}`}
                placeholder="Search suppliers..."
                value={search} onChange={e => setSearch(e.target.value)}
            />
                <div className="absolute right-12 top-1.5 z-10"><VoiceInput onResult={setSearch} isDark={isDark} /></div>
        </div>
        <button className={`p-3 rounded-xl border transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
            <Filter size={20} className="text-gray-500" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 hide-scrollbar">
          {['all', 'to-pay', 'to-receive', 'settled'].map(f => (
              <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap capitalize transition-colors ${filter === f ? 'bg-purple-500 text-white shadow-md' : isDark ? 'bg-slate-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}
                  >
                  {f.replace('-', ' ')}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-24 space-y-3">
        {filtered.map(supplier => (
            <div 
                key={supplier.id} 
                onClick={() => setSelectedSupplierId(supplier.id)}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-sm`}
            >
                <div>
                    <h3 className="font-bold text-lg leading-tight mb-0.5">{supplier.name}</h3>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                        <span className="flex items-center gap-1"><Phone size={12}/> {supplier.phone}</span>
                    </div>
                </div>
                <div className="text-right flex items-center gap-3">
                    <div>
                        <p className={`font-black text-lg ${supplier.balance < 0 ? 'text-red-500' : supplier.balance > 0 ? 'text-emerald-500' : 'text-gray-500'}`}>
                            ₹{Math.abs(supplier.balance).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{supplier.balance < 0 ? 'Payable' : supplier.balance > 0 ? 'Receivable' : 'Settled'}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                </div>
            </div>
        ))}
        {filtered.length === 0 && (
            <div className="text-center p-10 opacity-50"><BookOpen size={48} className="mx-auto mb-2"/> <p>No suppliers found</p></div>
        )}
      </div>

      <button onClick={() => setIsAddSupplierOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-purple-500/40 hover:bg-purple-600 transition-transform active:scale-95 z-40">
          <Plus size={26} />
      </button>

      {isAddSupplierOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`w-full max-w-sm rounded-2xl p-5 ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-2xl animate-in zoom-in-95 duration-200`}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-xl flex items-center gap-2"><BookOpen className="text-purple-500"/> New Supplier</h3>
                      <button onClick={() => setIsAddSupplierOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="space-y-3">
                      <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Supplier Name" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name: e.target.value})}/>
                      <input type="tel" className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Phone Number" value={newSupplier.phone} onChange={e=>setNewSupplier({...newSupplier, phone: e.target.value})}/>
                      <input type="number" className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Opening Balance (Use - for payable)" value={newSupplier.initialBalance} onChange={e=>setNewSupplier({...newSupplier, initialBalance: e.target.value})}/>
                      <button onClick={addSupplier} className="w-full py-3.5 bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 active:scale-95 mt-4">Save Supplier</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
