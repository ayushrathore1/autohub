import VoiceInput from '../VoiceInput';
import React, { useState, useMemo } from 'react';
import { ArrowLeft, ClipboardList, Plus, Search, X, User, Edit2, PenTool, CheckCircle, Clock } from 'lucide-react';

export interface JobCard {
    id: number;
    jobNumber: string;
    regNo: string;
    customerName: string;
    customerMobile?: string;
    mechanic: string;
    complaints: string;
    laborCost: number;
    partsCost: number;
    status: 'pending' | 'in-progress' | 'completed';
    date: string;
}

export const ServiceJobCards: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void; data?: any; onUpdateData?: (newData: any) => void; }> = ({ isDark, t, onBack, data, onUpdateData }) => {
  const jobCards: JobCard[] = data?.jobCards || [];
    const lastScannedVehicle = data?.lastScannedVehicle;
    const canUseLastScanned = !!lastScannedVehicle?.regNo;
  const setJobCards = (newJobCards: JobCard[]) => {
      if (onUpdateData) {
          onUpdateData({ jobCards: newJobCards });
      }
  };

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    regNo: '',
    customerName: '', 
    customerMobile: '',
    mechanic: '',
    complaints: '',
    laborCost: 0,
    partsCost: 0,
    status: 'pending' as 'pending' | 'in-progress' | 'completed'
  });

  const filtered = useMemo(() => {
    return jobCards.filter(jc => {
        const query = search.toLowerCase();
        const matchesSearch = jc.jobNumber.toLowerCase().includes(query) || 
                              jc.regNo.toLowerCase().includes(query) || 
                              jc.customerName.toLowerCase().includes(query);
        const matchesFilter = filter === 'all' || jc.status === filter;
        return matchesSearch && matchesFilter;
    });
  }, [search, filter, jobCards]);

  const handleOpenAdd = () => {
      setEditingId(null);
      setFormData({ regNo: '', customerName: '', customerMobile: '', mechanic: '', complaints: '', laborCost: 0, partsCost: 0, status: 'pending' });
      setIsModalOpen(true);
  };

  const handleOpenEdit = (jc: JobCard) => {
      setEditingId(jc.id);
      setFormData({
          regNo: jc.regNo,
          customerName: jc.customerName,
          customerMobile: jc.customerMobile || '',
          mechanic: jc.mechanic,
          complaints: jc.complaints,
          laborCost: jc.laborCost,
          partsCost: jc.partsCost,
          status: jc.status
      });
      setIsModalOpen(true);
  };

  const handleSubmit = () => {
      if(formData.regNo) {
          if (editingId) {
              setJobCards(jobCards.map(jc => 
                  jc.id === editingId 
                      ? { ...jc, ...formData, regNo: formData.regNo.toUpperCase() }
                      : jc
              ));
          } else {
              const jNum = `JC-${Math.floor(1000 + Math.random() * 9000)}`;
              setJobCards([{
                  id: Date.now(),
                  jobNumber: jNum,
                  ...formData,
                  regNo: formData.regNo.toUpperCase(),
                  date: new Date().toISOString().split('T')[0]
              }, ...jobCards]);
          }
          setIsModalOpen(false);
      }
  };

  return (
    <div className={`p-4 h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'} overflow-hidden`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-gray-200 dark:bg-slate-800 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="text-orange-500" /> {t('Job Cards')}</h2>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                className={`w-full pl-10 p-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}
                placeholder="Search Reg No, Job No..."
                value={search} onChange={e =>
                
                 setSearch(e.target.value)} />
                <div className="absolute right-12 top-1.5 z-10"><VoiceInput onResult={setSearch} isDark={isDark} /></div> 
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={16}/></button>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 hide-scrollbar">
          {['all', 'pending', 'in-progress', 'completed'].map(f => (
              <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap capitalize transition-colors ${filter === f ? 'bg-orange-500 text-white shadow-md' : isDark ? 'bg-slate-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}
                  >
                  {f.replace('-', ' ')}
              </button>
          ))}
      </div>

      <div className="grid gap-3 overflow-y-auto flex-1 pb-24">
        {filtered.length === 0 ? (
            <div className="text-center p-10 opacity-50"><ClipboardList size={48} className="mx-auto mb-2"/> <p>No job cards found</p></div>
        ) : filtered.map(jc => (
          <div 
              key={jc.id} 
              onClick={() => handleOpenEdit(jc)}
              className={`p-4 rounded-xl border cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden transition-all hover:shadow-md`}
          >
            {jc.status === 'pending' && (<div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm"><Clock size={12}/> Pending</div>)}
            {jc.status === 'in-progress' && (<div className="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm"><PenTool size={12}/> Editing</div>)}
            {jc.status === 'completed' && (<div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm"><CheckCircle size={12}/> Ready</div>)}

            <div className="flex items-start justify-between mt-1">
              <div>
                  <h3 className="font-bold text-lg leading-tight uppercase bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded inline-block border border-gray-300 dark:border-slate-600 mb-1">{jc.regNo}</h3>
                  <p className="text-sm font-bold mt-1 text-orange-600 dark:text-orange-400">{jc.jobNumber} &bull; {jc.date}</p>
              </div>
            </div>

            <div className="mt-2">
                <p className="text-sm line-clamp-1 italic text-gray-600 dark:text-gray-400">"{jc.complaints || 'No complaints recorded'}"</p>
            </div>

            <div className="mt-3 flex justify-between items-end border-t pt-3 dark:border-slate-700">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Customer</p>
                    <p className="text-sm font-bold flex items-center gap-1"><User size={14}/> {jc.customerName || 'Unknown'}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Est. Total</p>
                    <p className="text-sm font-bold flex items-center gap-1 justify-end text-green-600 dark:text-green-400">
                        ₹{(Number(jc.laborCost) + Number(jc.partsCost)).toLocaleString()}
                    </p>
                </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleOpenAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-orange-600 active:scale-95 transition-all z-10">
          <Plus size={26} />
      </button>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`w-full max-w-md rounded-2xl p-5 ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]`}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-xl flex items-center gap-2">
                        {editingId ? <Edit2 className="text-orange-500" /> : <ClipboardList className="text-orange-500"/>}
                        {editingId ? `Edit ${jobCards.find(j=>j.id===editingId)?.jobNumber}` : 'New Job Card'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X/></button>
                  </div>
                  <div className="space-y-3">
                                            {canUseLastScanned && !editingId && (
                                                <button
                                                    onClick={() => setFormData({
                                                        regNo: lastScannedVehicle.regNo || '',
                                                        customerName: lastScannedVehicle.customerName || '',
                                                        customerMobile: lastScannedVehicle.customerPhone || '',
                                                        mechanic: '',
                                                        complaints: lastScannedVehicle.notes || '',
                                                        laborCost: 0,
                                                        partsCost: 0,
                                                        status: 'pending'
                                                    })}
                                                    className="w-full py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 font-bold text-sm hover:bg-orange-100 transition-colors"
                                                >
                                                    Use last scanned vehicle ({lastScannedVehicle.regNo})
                                                </button>
                                            )}
                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
                          <select className={`w-full p-3 rounded-xl border font-bold outline-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                              <option value="pending">🟡 Pending / Waiting</option>
                              <option value="in-progress">🔵 In Progress</option>
                              <option value="completed">🟢 Completed</option>
                          </select>
                      </div>

                      <div className="pt-2 border-t dark:border-slate-700"></div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Reg No*</label>
                          <input className={`w-full p-3 rounded-xl border font-bold uppercase ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Vehicle Reg No" value={formData.regNo} onChange={e => setFormData({...formData, regNo: e.target.value})} />
                      </div>
                      
<div className="flex gap-2">
                          <div className="flex-[3]">
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Customer Name</label>
                              <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Customer Name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                          </div>
                          <div className="flex-[2]">
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Mobile</label>
                              <input type="tel" className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Phone" value={formData.customerMobile || ''} onChange={e => setFormData({...formData, customerMobile: e.target.value})} />
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Mechanic / Assigned To</label>
                          <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Mechanic Name" value={formData.mechanic} onChange={e => setFormData({...formData, mechanic: e.target.value})} />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Work Requested / Complaints</label>
                          <textarea className={`w-full p-3 rounded-xl border font-medium resize-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Brake pad change, oil leak..." rows={3} value={formData.complaints} onChange={e => setFormData({...formData, complaints: e.target.value})} />
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Est. Labor Cost (₹)</label>
                            <input type="number" className={`w-full p-3 rounded-xl border font-bold ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="0" value={formData.laborCost || ''} onChange={e => setFormData({...formData, laborCost: Number(e.target.value)})} />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Est. Parts Cost (₹)</label>
                            <input type="number" className={`w-full p-3 rounded-xl border font-bold ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="0" value={formData.partsCost || ''} onChange={e => setFormData({...formData, partsCost: Number(e.target.value)})} />
                        </div>
                      </div>
                      
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl flex justify-between items-center mt-2 border border-orange-100 dark:border-orange-900/50">
                          <span className="font-bold text-orange-800 dark:text-orange-400">Total Estimate:</span>
                          <span className="font-black text-xl text-orange-900 dark:text-orange-200">₹{Number(formData.laborCost) + Number(formData.partsCost)}</span>
                      </div>

                      <button 
                        onClick={handleSubmit} 
                        disabled={!formData.regNo}
                        className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 active:scale-95 transition-all mt-4 disabled:opacity-50"
                      >
                          {editingId ? 'Update Job Card' : 'Create Job Card'}
                      </button>

                      {editingId && formData.status === 'completed' && (
                          <button 
                              onClick={() => {
                                  const jcNum = jobCards.find(j=>j.id===editingId)?.jobNumber;
                                  if (onUpdateData) {
                                      onUpdateData({ 
                                         pendingInvoiceDraft: {
                                            customerName: formData.customerName,
                                            customerMobile: formData.customerMobile,
                                            regNo: formData.regNo,
                                            laborCost: formData.laborCost,
                                            partsCost: formData.partsCost,
                                            jobNo: jcNum
                                         }
                                      });
                                  }
                                  alert(`Job ${jcNum} sent to Invoice Builder! Open the "Invoice Pro" tool to automatically generate the bill.`);
                                  setIsModalOpen(false);
                              }}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all mt-2"
                          >
                              Convert to Invoice
                          </button>
                      )}
                      
                      {editingId && (
                          <button 
                              onClick={() => {
                                  if(confirm('Are you sure you want to delete this Job Card?')) {
                                      setJobCards(jobCards.filter(j => j.id !== editingId));
                                      setIsModalOpen(false);
                                  }
                              }} 
                              className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-all mt-2"
                          >
                              Delete Job Card
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};


