import VoiceInput from '../VoiceInput';
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Users, Search, Phone, MessageCircle, Star, History, TrendingUp, Filter, X } from 'lucide-react';

export const CustomerCRM: React.FC<{
  isDark: boolean;
  t: (key: string) => string;
  onBack: () => void;
  data?: any;
  onUpdateData?: (newData: any) => void;
}> = ({ isDark, onBack, data, onUpdateData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vip' | 'udhaar' | 'recent'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Derive consolidated customers list from invoices, job cards, and udhaar
  const consolidatedCustomers = useMemo(() => {
    let customerMap: { [key: string]: any } = {};

    // 1. Process explicit customers (from Invoices)
    if (data?.customers) {
      data.customers.forEach((c: any) => {
        const key = c.mobile && c.mobile.trim() !== '' ? c.mobile : c.name;
        if (!key) return;
        
        customerMap[key] = {
          name: c.name,
          mobile: c.mobile || '',
          totalBilled: c.totalBilled || 0,
          firstVisit: c.firstVisit || new Date().toISOString(),
          lastVisit: c.lastVisit || new Date().toISOString(),
          type: c.type || 'Retail',
          udhaarBalance: 0,
          visits: 1
        };
      });
    }

    // 2. Process Udhaar (Khata)
    if (data?.udhaarCustomers) {
      data.udhaarCustomers.forEach((u: any) => {
        const key = u.phone && u.phone.trim() !== '' ? u.phone : u.name;
        if (!key) return;

        if (customerMap[key]) {
          customerMap[key].udhaarBalance = u.balance || 0;
          if (new Date(u.lastUpdate) > new Date(customerMap[key].lastVisit)) {
             customerMap[key].lastVisit = u.lastUpdate;
          }
        } else {
          customerMap[key] = {
            name: u.name,
            mobile: u.phone || '',
            totalBilled: u.balance || 0, // estimate
            firstVisit: u.lastUpdate || new Date().toISOString(),
            lastVisit: u.lastUpdate || new Date().toISOString(),
            type: 'Retail',
            udhaarBalance: u.balance || 0,
            visits: 1
          };
        }
      });
    }

    // 3. Process Job Cards (Service visits)
    if (data?.jobCards) {
      data.jobCards.forEach((j: any) => {
        // Job cards currently only have customerName in previous schema, but we try adapting
        const key = j.customerMobile ? j.customerMobile : j.customerName;
        if (!key) return;

        if (customerMap[key]) {
          customerMap[key].visits += 1;
          const jDate = j.date || new Date().toISOString();
          if (new Date(jDate) > new Date(customerMap[key].lastVisit)) {
             customerMap[key].lastVisit = jDate;
          }
        } else {
          customerMap[key] = {
            name: j.customerName,
            mobile: j.customerMobile || '',
            totalBilled: (j.laborCost || 0) + (j.partsCost || 0),
            firstVisit: j.date || new Date().toISOString(),
            lastVisit: j.date || new Date().toISOString(),
            type: 'Service',
            udhaarBalance: 0,
            visits: 1
          };
        }
      });
    }

    return Object.values(customerMap).sort((a: any, b: any) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
  }, [data]);

  const filteredCustomers = useMemo(() => {
    return consolidatedCustomers.filter((c: any) => {
      const matchSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile?.includes(searchTerm);
      if (!matchSearch) return false;

      if (filterType === 'vip') return c.totalBilled > 5000 || c.visits > 3;
      if (filterType === 'udhaar') return c.udhaarBalance > 0;
      if (filterType === 'recent') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(c.lastVisit) > thirtyDaysAgo;
      }
      return true;
    });
  }, [consolidatedCustomers, searchTerm, filterType]);

  const handleCall = (e: React.MouseEvent, mobile: string) => {
    e.stopPropagation();
    if (mobile) window.open(`tel:${mobile}`);
  };

  const handleWhatsApp = (e: React.MouseEvent, mobile: string) => {
    e.stopPropagation();
    if (mobile) window.open(`https://wa.me/${mobile.replace(/\D/g, '')}`, '_blank');
  };

  const handleSendDueBill = (e: React.MouseEvent, customer: any) => {
    e.stopPropagation();
    if (!customer.mobile) return;
    
    let historyStr = "";
    if (data?.udhaarCustomers) {
      const uCustomer = data.udhaarCustomers.find((u: any) => u.phone === customer.mobile || u.name === customer.name);
      if (uCustomer && uCustomer.history && uCustomer.history.length > 0) {
        historyStr = "\n*Recent Transactions:*\n" + uCustomer.history.slice(-5).map((h: any) => 
          `• ${new Date(h.date).toLocaleDateString()}: ${h.type === 'given' ? 'Udhaar Added' : 'Payment Received'} - ₹${h.amount}`
        ).join("\n");
      }
    }

    const message = `*🧾 BILL DUE REMINDER 🧾*\n\nDear ${customer.name},\nThis is a gentle reminder that you have an outstanding due balance of *₹${customer.udhaarBalance}*.\n${historyStr}\n\nLast Interaction: ${new Date(customer.lastVisit).toLocaleDateString()}\n\nPlease clear the dues at your earliest convenience.\nThank you!`;
    window.open(`https://wa.me/${customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className={`absolute inset-0 z-40 bg-[#F4F7FE] flex flex-col font-sans transition-colors duration-300 ${isDark ? 'dark bg-slate-950' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={24} className="text-[#0F1724] dark:text-white" />
          </button>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F1724] dark:text-white flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              Customer CRM
            </h2>
            <p className="text-[12px] text-[#556077] dark:text-slate-400">Manage client relationships</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar space-y-4">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
             <div className="flex gap-2 items-center text-blue-600 mb-1">
               <History size={16} /> 
               <span className="text-[12px] font-semibold uppercase tracking-wide">Total Clients</span>
             </div>
             <p className="text-[20px] font-bold text-gray-900 dark:text-white">{consolidatedCustomers.length}</p>
           </div>
           <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
             <div className="flex gap-2 items-center text-emerald-600 mb-1">
               <Star size={16} /> 
               <span className="text-[12px] font-semibold uppercase tracking-wide">VIP Clients</span>
             </div>
             <p className="text-[20px] font-bold text-gray-900 dark:text-white">
                {consolidatedCustomers.filter((c: any) => c.totalBilled > 5000 || c.visits > 3).length}
             </p>
           </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
           <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search name or mobile..."
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl py-3 pl-9 pr-12 text-[14px] outline-none focus:border-blue-500 shadow-sm dark:text-white"
              />
                <div className="absolute right-12 top-1.5 z-10"><VoiceInput onResult={setSearchTerm} isDark={isDark} /></div>
           </div>
           <select 
             value={filterType}
             onChange={e => setFilterType(e.target.value as any)}
             className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-3 text-[14px] text-gray-700 dark:text-slate-300 outline-none focus:border-blue-500 shadow-sm"
           >
             <option value="all">All</option>
             <option value="vip">VIPs</option>
             <option value="udhaar">Due Bal</option>
             <option value="recent">Recent</option>
           </select>
        </div>

        {/* Customer List */}
        <div className="space-y-3 pb-20">
          {filteredCustomers.length === 0 ? (
             <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-gray-400">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>No customers found</p>
             </div>
          ) : (
            filteredCustomers.map((customer: any, idx: number) => (
              <div 
                key={idx} 
                onClick={() => setSelectedCustomer(customer)}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 active:scale-95 transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        {customer.name}
                        {(customer.totalBilled > 5000 || customer.visits > 3) && <Star size={12} className="fill-orange-400 text-orange-400" />}
                     </h3>
                     <p className="text-[12px] text-gray-500">{customer.mobile}</p>
                   </div>
                   <div className="text-right">
                     <span className="text-[14px] font-bold text-emerald-600 block">₹{customer.totalBilled?.toFixed(2)}</span>
                     <span className="text-[10px] text-gray-400 block">Lifetime Val</span>
                   </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 dark:border-slate-800">
                   <div className="flex gap-3 text-[11px] text-gray-500">
                      <span>{customer.visits} {customer.visits === 1 ? 'Visit' : 'Visits'}</span>
                      {customer.udhaarBalance > 0 && <span className="text-red-500 font-semibold">• ₹{customer.udhaarBalance} Due</span>}
                   </div>
                   <div className="flex gap-2">
                      {customer.mobile && (
                        <>
                          <button onClick={(e) => handleCall(e, customer.mobile)} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                            <Phone size={14} />
                          </button>
                          <button onClick={(e) => handleWhatsApp(e, customer.mobile)} className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-full hover:bg-green-100 transition-colors">
                            <MessageCircle size={14} />
                          </button>
                        </>
                      )}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Profile Modal View */}
      {selectedCustomer && (
        <div className="absolute inset-0 z-50 bg-black/50 flex flex-col justify-end animate-in fade-in" onClick={() => setSelectedCustomer(null)}>
           <div className="bg-white dark:bg-slate-900 w-full h-[70%] rounded-t-3xl p-6 animate-in slide-in-from-bottom flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3 shadow-md">
                     {selectedCustomer.name.charAt(0).toUpperCase()}
                   </div>
                   <h2 className="text-2xl font-bold dark:text-white">{selectedCustomer.name}</h2>
                   <p className="text-gray-500 flex items-center gap-1"><Phone size={14}/> {selectedCustomer.mobile || 'No Mobile'}</p>
                 </div>
                 <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full">
                    <X size={20} className="dark:text-white"/>
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                   <p className="text-[11px] text-gray-500 mb-1">Lifetime Spent</p>
                   <p className="text-[16px] font-bold text-gray-900 dark:text-white">₹{selectedCustomer.totalBilled || 0}</p>
                 </div>
                 <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                   <p className="text-[11px] text-red-500 font-medium mb-1">Udhaar Due</p>
                   <p className="text-[16px] font-bold text-red-600">₹{selectedCustomer.udhaarBalance || 0}</p>
                 </div>
                 <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                   <p className="text-[11px] text-gray-500 mb-1">Total Visits</p>
                   <p className="text-[16px] font-bold text-gray-900 dark:text-white">{selectedCustomer.visits}</p>
                 </div>
                 <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                   <p className="text-[11px] text-gray-500 mb-1">Last Interaction</p>
                   <p className="text-[14px] font-bold text-gray-900 dark:text-white">{new Date(selectedCustomer.lastVisit).toLocaleDateString()}</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 hide-scrollbar pr-2">
                 <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Customer Tags</h4>
                 <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">{selectedCustomer.type}</span>
                    {selectedCustomer.udhaarBalance > 0 && <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold">In Credit</span>}
                    {(selectedCustomer.totalBilled > 5000 || selectedCustomer.visits > 3) && <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-semibold">VIP Loyal</span>}
                 </div>

                  {(() => {
                    const customerVehicles = (data?.vehicles || []).filter((v: any) =>
                      (v.customerPhone && v.customerPhone === selectedCustomer.mobile) ||
                      (v.customerName && v.customerName === selectedCustomer.name)
                    );
                    if (customerVehicles.length === 0) return null;
                    return (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Registered Vehicles</h4>
                        <div className="space-y-2">
                          {customerVehicles.map((v: any) => (
                           <div key={v.id} className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                             <div>
                               <p className="font-bold text-sm text-gray-900 dark:text-white uppercase">{v.regNo}</p>
                               <p className="text-[10px] text-gray-500 font-medium mt-0.5">{[v.make, v.model, v.year].filter(Boolean).join(' ') || 'Vehicle'}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] text-gray-400 font-medium">Last Service</p>
                               <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{v.lastServiceDate || 'N/A'}</p>
                             </div>
                           </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const recentScans = (data?.scannedVehicles || []).filter((s: any) =>
                      (s.customerPhone && s.customerPhone === selectedCustomer.mobile) ||
                      (s.customerName && s.customerName === selectedCustomer.name)
                    ).slice(0, 3);
                    if (recentScans.length === 0) return null;
                    return (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Recent Scans</h4>
                        <div className="space-y-2">
                          {recentScans.map((s: any) => (
                           <div key={s.id} className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                             <div>
                               <p className="font-bold text-sm text-gray-900 dark:text-white uppercase">{s.regNo}</p>
                               <p className="text-[10px] text-gray-500 font-medium mt-0.5">Scanned</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] text-gray-400 font-medium">Date</p>
                               <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{new Date(s.scannedAt).toLocaleDateString()}</p>
                             </div>
                           </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                 {/* Active Warranties */}
                 {(() => {
                     const customerWarranties = (data?.warranties || []).filter((w: any) => (w.phone && w.phone === selectedCustomer.mobile) || (w.customer && w.customer === selectedCustomer.name));
                     if (customerWarranties.length === 0) return null;
                     return (
                         <div className="mb-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Registered Warranties</h4>
                            <div className="space-y-2">
                               {customerWarranties.map((w: any, i: number) => (
                                   <div key={i} className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                                       <div>
                                           <p className="font-bold text-sm text-gray-900 dark:text-white">{w.item}</p>
                                           <p className="text-[10px] text-gray-500 font-mono mt-0.5 max-w-[120px] truncate" title={w.serialNo}>S/N: {w.serialNo}</p>
                                       </div>
                                       <div className="text-right">
                                           <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${w.status === 'expired' ? 'bg-red-100 text-red-600' : w.status === 'expiring-soon' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                              {w.status.replace('-', ' ')}
                                           </span>
                                           <p className="text-[10px] text-gray-400 mt-1 font-medium">Exp: {w.expiryDate}</p>
                                       </div>
                                   </div>
                               ))}
                            </div>
                         </div>
                     )
                 })()}
              </div>

              {selectedCustomer.mobile && (
                <div className="flex gap-2 pt-4 border-t dark:border-slate-800 mt-auto flex-wrap">
                   <button onClick={(e) => handleCall(e, selectedCustomer.mobile)} className="flex-1 py-3 px-2 bg-blue-600 text-white rounded-xl font-semibold flex justify-center items-center gap-2 active:scale-95 transition-transform"><Phone size={18}/> Call</button>
                   <button onClick={(e) => handleWhatsApp(e, selectedCustomer.mobile)} className="flex-1 py-3 px-2 bg-green-500 text-white rounded-xl font-semibold flex justify-center items-center gap-2 active:scale-95 transition-transform"><MessageCircle size={18}/> Chat</button>
                   {selectedCustomer.udhaarBalance > 0 && (
                     <button onClick={(e) => handleSendDueBill(e, selectedCustomer)} className="w-full mt-2 py-3 px-2 bg-red-500 text-white rounded-xl font-semibold flex justify-center items-center gap-2 active:scale-95 transition-transform"><History size={18}/> Send Due Bill Reminder</button>
                   )}
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};
