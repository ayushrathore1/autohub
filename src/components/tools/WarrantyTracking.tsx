import React, { useState, useMemo } from 'react';
import { ArrowLeft, Shield, AlertTriangle, Plus, Calendar, Search, ScanBarcode, CheckCircle, X, User, Edit2 } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface Warranty {
    id: number;
    customer: string;
    phone: string;
    item: string;
    serialNo: string;
    purchaseDate: string;
    expiryDate: string;
    status: string;
}

export const WarrantyTracking: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void }> = ({ isDark, t, onBack }) => {
  const [warranties, setWarranties] = useState<Warranty[]>([
    { id: 1, customer: 'Rahul Sharma', phone: '9898989898', item: 'Amaron Battery 45Ah', serialNo: 'AMR-998877', purchaseDate: '2023-11-15', expiryDate: '2026-11-15', status: 'active' },
    { id: 2, customer: 'Vikram Singh', phone: '9123412340', item: 'Bosch Wiper Blades', serialNo: 'BSH-112233', purchaseDate: '2024-01-10', expiryDate: '2024-07-10', status: 'expiring-soon' },
    { id: 3, customer: 'Sanjay Motors', phone: '9988776655', item: 'Exide Din60', serialNo: 'EXI-445566', purchaseDate: '2020-01-15', expiryDate: '2024-01-15', status: 'expired' }
  ]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ customer: '', phone: '', item: '', serialNo: '', months: '12' });

  const filtered = useMemo(() => {
    return warranties.filter(w => {
        const matchesSearch = w.serialNo.toLowerCase().includes(search.toLowerCase()) || w.customer.toLowerCase().includes(search.toLowerCase()) || w.phone.includes(search);
        const matchesFilter = filter === 'all' || w.status === filter;
        return matchesSearch && matchesFilter;
    });
  }, [search, filter, warranties]);

  const handleOpenAdd = () => {
      setEditingId(null);
      setFormData({ customer: '', phone: '', item: '', serialNo: '', months: '12' });
      setIsModalOpen(true);
  };

  const handleOpenEdit = (w: Warranty) => {
      setEditingId(w.id);
      
      const pDate = new Date(w.purchaseDate);
      const eDate = new Date(w.expiryDate);
      let monthsDifference = (eDate.getFullYear() - pDate.getFullYear()) * 12 + (eDate.getMonth() - pDate.getMonth());
      if (monthsDifference <= 0) monthsDifference = 12;
      
      setFormData({ 
          customer: w.customer, 
          phone: w.phone, 
          item: w.item, 
          serialNo: w.serialNo, 
          months: monthsDifference.toString() 
      });
      setIsModalOpen(true);
  };

  const handleSubmit = () => {
      if(formData.customer && formData.serialNo && formData.item) {
          const purchaseDate = new Date();
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + parseInt(formData.months));

          if (editingId) {
              setWarranties(warranties.map(w => 
                  w.id === editingId 
                      ? { 
                          ...w, 
                          ...formData,
                          expiryDate: expiryDate.toISOString().split('T')[0]
                        }
                      : w
              ));
          } else {
              setWarranties([{
                  id: Date.now(),
                  ...formData,
                  purchaseDate: purchaseDate.toISOString().split('T')[0],
                  expiryDate: expiryDate.toISOString().split('T')[0],
                  status: 'active'
              }, ...warranties]);
          }

          setIsModalOpen(false);
      }
  };

  return (
    <div className={`p-4 h-full flex flex-col ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full">
            <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Shield className="text-emerald-500" /> {t('Warranties')}</h2>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                className={`w-full pl-10 p-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`}
                placeholder="Search Serial No, Phone..."
                value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={16}/></button>}
        </div>
        <button
            onClick={() => setIsScannerOpen(true)}
            className={`p-3 rounded-xl border flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-300 hover:bg-gray-100'} text-blue-500`}
            title="Scan Serial Barcode"
        >
            <ScanBarcode size={24} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
          {['all', 'active', 'expiring-soon', 'expired'].map(f => (
              <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap capitalize transition-colors ${filter === f ? 'bg-emerald-500 text-white shadow-md' : isDark ? 'bg-slate-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}
                  >
                  {f.replace('-', ' ')}
              </button>
          ))}
      </div>

      <div className="grid gap-3 overflow-y-auto flex-1 pb-24">
        {filtered.length === 0 ? (
            <div className="text-center p-10 opacity-50"><Shield size={48} className="mx-auto mb-2"/> <p>No warranties found</p></div>
        ) : filtered.map(warranty => (
          <div 
              key={warranty.id} 
              onClick={() => handleOpenEdit(warranty)}
              className={`p-4 rounded-xl border cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden transition-all hover:shadow-md`}
          >
            {warranty.status === 'expiring-soon' && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm"><AlertTriangle size={12}/> Expiring Soon</div>
            )}
            {warranty.status === 'expired' && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg shadow-sm">Expired</div>
            )}
            {warranty.status === 'active' && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm"><CheckCircle size={12}/> Active</div>
            )}

            <div className="mt-1 flex items-start justify-between pr-24">
              <div>
                  <h3 className="font-bold text-lg leading-tight">{warranty.item}</h3>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold mt-0.5 tracking-wider bg-blue-50 dark:bg-blue-900/30 inline-block px-1.5 rounded">S/N: {warranty.serialNo}</p>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-end border-t pt-3 dark:border-slate-700">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Customer</p>
                    <p className="text-sm font-bold flex items-center gap-1"><User size={14}/> {warranty.customer}</p>
                    <p className="text-xs text-gray-500">{warranty.phone}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Valid Till</p>
                    <p className={`text-sm font-bold flex items-center gap-1 justify-end ${warranty.status === 'expired' ? 'text-red-500' : warranty.status === 'expiring-soon' ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        <Calendar size={14}/> {warranty.expiryDate}
                    </p>
                </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleOpenAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-emerald-600 active:scale-95 transition-all">
          <Plus size={26} />
      </button>

      {isScannerOpen && (
          <BarcodeScanner
              onScan={(txt) => { setSearch(txt); setIsScannerOpen(false); }}
              onClose={() => setIsScannerOpen(false)}
          />
      )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`w-full max-w-sm rounded-2xl p-5 ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-2xl animate-in zoom-in-95 duration-200`}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-xl flex items-center gap-2">
                        {editingId ? <Edit2 className="text-emerald-500" /> : <Shield className="text-emerald-500"/>}
                        {editingId ? 'Edit Warranty' : 'Register Warranty'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X/></button>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Customer Name" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
                      </div>
                      <div>
                          <input type="tel" className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div className="pt-2 border-t dark:border-slate-700"></div>
                      <div>
                          <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Item Name (e.g. Amaron 45Ah)" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                          <div className="flex-[2] relative">
                              <input className={`w-full p-3 pr-10 rounded-xl border font-bold font-mono tracking-wide ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Serial No." value={formData.serialNo} onChange={e => setFormData({...formData, serialNo: e.target.value})} />
                              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500"><ScanBarcode size={20}/></button>
                          </div>
                      </div>
                      <div>
                          <select className={`w-full p-3 rounded-xl border font-bold outline-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} value={formData.months} onChange={e => setFormData({...formData, months: e.target.value})}>
                              <option value="6">6 Months Warranty</option>
                              <option value="12">1 Year Warranty</option>
                              <option value="18">18 Months Warranty</option>
                              <option value="24">2 Years Warranty</option>
                              <option value="36">3 Years Warranty</option>
                              <option value="48">4 Years Warranty</option>
                              <option value="60">5 Years Warranty</option>
                          </select>
                      </div>
                      <button onClick={handleSubmit} className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 active:scale-95 transition-all mt-4">
                          {editingId ? 'Update Warranty' : 'Activate Warranty'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
