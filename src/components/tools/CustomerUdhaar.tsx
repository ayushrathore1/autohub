import React, { useState, useMemo } from 'react';
import { ArrowLeft, UserPlus, Phone, MessageCircle, Calendar, Plus, Search, ChevronRight, Calculator, X, User, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface CustomerHistory {
    id: string;
    date: string;
    amount: number;
    type: 'gave' | 'got';
    note: string;
}

interface Customer {
    id: number;
    name: string;
    phone: string;
    balance: number;
    lastUpdate: string;
    history: CustomerHistory[];
}

export const CustomerUdhaar: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void }> = ({ isDark, t, onBack }) => {
  const [customers, setCustomers] = useState<Customer[]>([
    { id: 1, name: 'Rahul Sharma', phone: '9898989898', balance: 4500, lastUpdate: '2023-11-20', history: [] },
    { id: 2, name: 'Vikram Motors', phone: '9123412340', balance: 12500, lastUpdate: '2023-11-18', history: [] },
    { id: 3, name: 'Sanjay Singh', phone: '9988776655', balance: 800, lastUpdate: '2023-11-15', history: [] },
  ]);

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', initialBalance: '' });
  const [selectedCustId, setSelectedCustId] = useState<number | null>(null);

  // Transaction state
  const [txnType, setTxnType] = useState<'gave' | 'got' | null>(null);
  const [txnAmount, setTxnAmount] = useState('');
  const [txnNote, setTxnNote] = useState('');

  const totalDue = customers.reduce((acc, c) => acc + c.balance, 0);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  }, [search, customers]);

  const selectedCustomer = customers.find(c => c.id === selectedCustId);

  const handleWhatsApp = (phone: string, balance: number, name: string) => {
    const msg = `Hello ${name}, your pending due amount is \u20B9${balance}. Please clear it at the earliest. Thank you.`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleAddCustomer = () => {
    if (newCustomer.name && newCustomer.phone) {
        setCustomers([{
            id: Date.now(),
            name: newCustomer.name,
            phone: newCustomer.phone,
            balance: Number(newCustomer.initialBalance) || 0,
            lastUpdate: new Date().toISOString().split('T')[0],
            history: []
        }, ...customers]);
        setIsAddModalOpen(false);
        setNewCustomer({ name: '', phone: '', initialBalance: '' });
    }
  };

  const handleAddTransaction = () => {
    if (!selectedCustomer || !txnType || !txnAmount) return;
    const amount = Number(txnAmount);
    if (amount <= 0) return;

    setCustomers(customers.map(c => {
        if (c.id === selectedCustomer.id) {
            const newBalance = txnType === 'gave' ? c.balance + amount : c.balance - amount;
            const newHistory = [{
                id: Date.now().toString(),
                date: new Date().toISOString(),
                amount,
                type: txnType,
                note: txnNote
            }, ...c.history];
            return { ...c, balance: newBalance, history: newHistory, lastUpdate: new Date().toISOString().split('T')[0] };
        }
        return c;
    }));

    setTxnType(null);
    setTxnAmount('');
    setTxnNote('');
  };

  if (selectedCustomer) {
      // Detailed View
      return (
          <div className={`p-4 min-h-screen flex flex-col ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setSelectedCustId(null)} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 transition-colors shadow-sm">
                      <ArrowLeft size={20} />
                  </button>
                  <div>
                      <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                      <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12}/> {selectedCustomer.phone}</p>
                  </div>
              </div>

              <div className={`p-6 rounded-3xl mb-6 text-center shadow-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Net Balance</p>
                  <h3 className={`text-5xl font-black mb-4 ${selectedCustomer.balance > 0 ? 'text-red-500' : selectedCustomer.balance < 0 ? 'text-green-500' : isDark ? 'text-white' : 'text-black'}`}>
                      &#8377;{Math.abs(selectedCustomer.balance).toLocaleString('en-IN')}
                      <span className="text-lg ml-2">{selectedCustomer.balance > 0 ? 'Due' : selectedCustomer.balance < 0 ? 'Advance' : ''}</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 mt-6">
                      <button onClick={() => setTxnType('gave')} className="py-3 px-4 rounded-xl font-bold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center gap-2 transition-all active:scale-95">
                          <ArrowUpCircle size={20} /> You Gave &#8377;
                      </button>
                      <button onClick={() => setTxnType('got')} className="py-3 px-4 rounded-xl font-bold bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center gap-2 transition-all active:scale-95">
                          <ArrowDownCircle size={20} /> You Got &#8377;
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-auto hide-scrollbar pb-10">
                  <h4 className="font-bold text-lg mb-3 tracking-wide">Transaction History</h4>
                  {selectedCustomer.history.length === 0 ? (
                      <div className="text-center p-8 opacity-50 border-2 border-dashed rounded-2xl dark:border-slate-700">
                           <Calendar className="mx-auto mb-2 opacity-50" size={32}/>
                           <p>No transactions yet</p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          {selectedCustomer.history.map(txn => (
                              <div key={txn.id} className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                  <div>
                                      <p className="font-bold text-sm">{new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                      {txn.note && <p className="text-xs text-gray-500 mt-0.5">{txn.note}</p>}
                                  </div>
                                  <div className={`font-black text-lg ${txn.type === 'gave' ? 'text-red-500' : 'text-green-500'}`}>
                                      {txn.type === 'gave' ? '+' : '-'} &#8377;{txn.amount.toLocaleString('en-IN')}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Add Transaction Modal */}
              {txnType && (
                  <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                      <div className={`w-full max-w-sm rounded-3xl p-6 ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-2xl animate-in zoom-in-95 duration-200 border ${txnType === 'gave' ? 'border-red-500/30' : 'border-green-500/30'}`}>
                          <div className="flex justify-between items-center mb-6">
                              <h3 className={`font-black text-xl flex items-center gap-2 ${txnType === 'gave' ? 'text-red-500' : 'text-green-500'}`}>
                                  {txnType === 'gave' ? <><ArrowUpCircle/> You Gave &#8377;</> : <><ArrowDownCircle/> You Got &#8377;</>}
                              </h3>
                              <button onClick={() => {setTxnType(null); setTxnAmount(''); setTxnNote('');}} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X size={20}/></button>
                          </div>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Amount</label>
                                  <input type="number" autoFocus className={`w-full p-4 rounded-2xl border-2 font-black text-2xl outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500'}`} placeholder="0" value={txnAmount} onChange={e => setTxnAmount(e.target.value)} />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Details / Bill No (Optional)</label>
                                  <input className={`w-full p-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500'}`} placeholder="Enter note..." value={txnNote} onChange={e => setTxnNote(e.target.value)} />
                              </div>
                              <button onClick={handleAddTransaction} className={`w-full py-4 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all mt-4 ${txnType === 'gave' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-green-500 hover:bg-green-600 shadow-green-500/30'}`}>
                                  Save Entry
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // Main List View
  return (
    <div className={`p-4 h-full flex flex-col ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 transition-colors shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Calculator className="text-orange-500" /> {t('Udhaar Book')}</h2>
        </div>
      </div>

      <div className={`p-5 mb-6 rounded-3xl shadow-lg border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-orange-900/40 to-slate-800 border-orange-500/20' : 'bg-gradient-to-br from-orange-50 to-white border-orange-200'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <Calculator size={64}/>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total To Collect</p>
          <div className="text-4xl font-black text-orange-600 dark:text-orange-500 flex items-center">
              &#8377; {totalDue.toLocaleString('en-IN')}
          </div>
      </div>

      <div className="flex gap-2 mb-4">
          <div className="relative flex-1 flex flex-col">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                  className={`w-full pl-10 p-4 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-orange-500' : 'bg-white shadow-sm border-gray-200 focus:border-orange-500'}`}
                  placeholder="Search customer..."
                  value={search} onChange={e => setSearch(e.target.value)} 
              />
          </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 space-y-3 hide-scrollbar">
        {filteredCustomers.length === 0 ? (
             <div className="text-center p-10 opacity-50"><User size={48} className="mx-auto mb-2"/> <p>No customers found</p></div>
        ) : filteredCustomers.map(customer => (
          <div key={customer.id} onClick={() => setSelectedCustId(customer.id)} className={`p-4 rounded-2xl border cursor-pointer active:scale-[0.98] transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border-slate-700 hover:border-orange-500/50' : 'bg-white border-gray-200 hover:border-orange-300'} flex items-center justify-between group`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${isDark ? 'bg-slate-700 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                  {customer.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight group-hover:text-orange-500 transition-colors">{customer.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={12}/> {customer.phone}</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-2">
              <span className="font-black text-lg text-red-500 flex items-center tracking-wide">
                  &#8377;{customer.balance.toLocaleString('en-IN')}
              </span>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                      onClick={() => handleWhatsApp(customer.phone, customer.balance, customer.name)}
                      className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-500 transition-colors shadow-sm"
                      title="Send WhatsApp Reminder"
                  >
                      <MessageCircle size={16} />
                  </button>
                  <button onClick={() => setSelectedCustId(customer.id)} className="p-2 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-500 transition-colors shadow-sm">
                      <ChevronRight size={16} />
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-6 right-6 px-6 py-4 bg-orange-500 text-white rounded-full flex items-center gap-3 font-black shadow-xl shadow-orange-500/40 hover:bg-orange-600 active:scale-95 transition-all z-10 hover:pr-8 group">
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" /> <span className="hidden md:inline">Add Customer</span>
      </button>

      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`w-full max-w-sm rounded-3xl p-6 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'} shadow-2xl animate-in zoom-in-95 duration-200`}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-xl flex items-center gap-2"><UserPlus className="text-orange-500"/> Add Customer</h3>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                          <input className={`w-full p-3.5 rounded-xl border-2 font-medium outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-orange-500' : 'bg-gray-50 border-gray-200 focus:border-orange-500'}`} placeholder="Enter name" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} autoFocus/>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone Number</label>
                          <input type="tel" className={`w-full p-3.5 rounded-xl border-2 font-medium outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-orange-500' : 'bg-gray-50 border-gray-200 focus:border-orange-500'}`} placeholder="10-digit number" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Opening Balance (&#8377;)</label>
                          <input type="number" className={`w-full p-3.5 rounded-xl border-2 font-black text-xl outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-orange-500' : 'bg-gray-50 border-gray-200 focus:border-orange-500'}`} placeholder="0" value={newCustomer.initialBalance} onChange={e => setNewCustomer({...newCustomer, initialBalance: e.target.value})} />
                      </div>
                      <button onClick={handleAddCustomer} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 active:scale-95 transition-all mt-6">
                          Save Customer
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
