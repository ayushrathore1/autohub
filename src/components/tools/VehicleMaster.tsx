import VoiceInput from '../VoiceInput';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Camera, Car, Edit2, Plus, Search, Settings, User, X } from 'lucide-react';

export interface Vehicle {
    id: number;
    regNo: string;
    make: string;
    model: string;
    customerName: string;
    customerPhone: string;
    year: string;
    mileage: string;
    notes: string;
    lastServiceDate: string;
}

export const VehicleMaster: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void; data?: any; onUpdateData?: (newData: any) => void; }> = ({ isDark, t, onBack, data, onUpdateData }) => {
  const vehicles: Vehicle[] = data?.vehicles || [];
  const setVehicles = (newVehicles: Vehicle[]) => {
      if (onUpdateData) {
          onUpdateData({ vehicles: newVehicles });
      }
  };

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
    const [isOcrOpen, setIsOcrOpen] = useState(false);
    const [isOcrBusy, setIsOcrBusy] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState('');
    const ocrInputRef = useRef<HTMLInputElement | null>(null);
    const ocrVideoRef = useRef<HTMLVideoElement | null>(null);
    const ocrCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const ocrStreamRef = useRef<MediaStream | null>(null);

  const [formData, setFormData] = useState({ 
    regNo: '', 
    make: '', 
    model: '', 
    customerName: '', 
    customerPhone: '',
    year: '',
    mileage: '',
    notes: ''
  });

  const filtered = useMemo(() => {
    return vehicles.filter(v => {
        const query = search.toLowerCase();
        return v.regNo.toLowerCase().includes(query) || 
               v.customerPhone.includes(query) || 
               v.customerName.toLowerCase().includes(query) ||
               v.make.toLowerCase().includes(query) ||
               v.model.toLowerCase().includes(query);
    });
  }, [search, vehicles]);

  const handleOpenAdd = () => {
      setEditingId(null);
      setFormData({ regNo: '', make: '',  model: '', customerName: '', customerPhone: '', year: '', mileage: '', notes: '' });
      setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
      setEditingId(v.id);
      setFormData({ 
          regNo: v.regNo, 
          make: v.make, 
          model: v.model, 
          customerName: v.customerName, 
          customerPhone: v.customerPhone,
          year: v.year,
          mileage: v.mileage,
          notes: v.notes
      });
      setIsModalOpen(true);
  };

  const handleSubmit = () => {
      if(formData.regNo && formData.customerName) {
          if (editingId) {
              setVehicles(vehicles.map(v => 
                  v.id === editingId 
                      ? { ...v, ...formData, regNo: formData.regNo.toUpperCase() }
                      : v
              ));
          } else {
              setVehicles([{
                  id: Date.now(),
                  ...formData,
                  regNo: formData.regNo.toUpperCase(),
                  lastServiceDate: new Date().toISOString().split('T')[0]
              }, ...vehicles]);
          }
          setIsModalOpen(false);
      }
  };

    const parseIndiaPlate = (text: string) => {
        const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const pattern = /[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}/g;
        const matches = cleaned.match(pattern) || [];
        const plate = matches.length ? matches[0] : '';
        if (!plate) return { plate: '', stateCode: '', rtoCode: '', series: '', number: '' };

        const stateCode = plate.slice(0, 2);
        const rtoCode = plate.slice(2, plate.length - 4).match(/\d{1,2}/)?.[0] || '';
        const series = plate.slice(2 + rtoCode.length, plate.length - 4);
        const number = plate.slice(-4);

        return { plate, stateCode, rtoCode, series, number };
    };

    const stateNameMap: Record<string, string> = {
        AN: 'Andaman and Nicobar', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam',
        BR: 'Bihar', CH: 'Chandigarh', CG: 'Chhattisgarh', DD: 'Daman and Diu', DL: 'Delhi',
        DN: 'Dadra and Nagar Haveli', GA: 'Goa', GJ: 'Gujarat', HP: 'Himachal Pradesh',
        HR: 'Haryana', JH: 'Jharkhand', JK: 'Jammu and Kashmir', KA: 'Karnataka',
        KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MH: 'Maharashtra', ML: 'Meghalaya',
        MN: 'Manipur', MP: 'Madhya Pradesh', MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha',
        PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu',
        TS: 'Telangana', TR: 'Tripura', UK: 'Uttarakhand', UP: 'Uttar Pradesh', WB: 'West Bengal'
    };

    const normalizeOcrImage = async (file: File) => {
        const bitmap = await createImageBitmap(file);
        const minWidth = 240;
        const minHeight = 60;
        if (bitmap.width < minWidth || bitmap.height < minHeight) {
            return { error: 'Image too small. Move closer and capture again.' };
        }

        const targetWidth = bitmap.width < 640 ? 640 : bitmap.width;
        const scale = targetWidth / bitmap.width;
        const targetHeight = Math.max(Math.round(bitmap.height * scale), minHeight);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return { error: 'Unable to process image. Try again.' };
        }
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) {
            return { error: 'Unable to process image. Try again.' };
        }
        return { file: new File([blob], file.name || 'plate.jpg', { type: 'image/jpeg' }) };
    };

    const handleOcrFile = async (file: File) => {
        setIsOcrBusy(true);
        setOcrError(null);
        setOcrText('');

        try {
            const normalized = await normalizeOcrImage(file);
            if ('error' in normalized) {
                setOcrError(normalized.error);
                return;
            }

            const Tesseract = await import('tesseract.js');
            const result = await Tesseract.recognize(normalized.file, 'eng', {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            } as any);
            const raw = result?.data?.text || '';
            setOcrText(raw);

            const { plate, stateCode, rtoCode, series, number } = parseIndiaPlate(raw);
            if (!plate) {
                setOcrError('No plate detected. Try a clearer image.');
                return;
            }

            const stateName = stateNameMap[stateCode] || '';
            const parsedNotes = [
                stateCode ? `State: ${stateCode}${stateName ? ` (${stateName})` : ''}` : '',
                rtoCode ? `RTO: ${rtoCode}` : '',
                series ? `Series: ${series}` : '',
                number ? `Number: ${number}` : ''
            ].filter(Boolean).join(' | ');

            const newVehicle: Vehicle = {
                id: Date.now(),
                regNo: plate,
                make: '',
                model: '',
                customerName: 'Unknown',
                customerPhone: '',
                year: '',
                mileage: '',
                notes: parsedNotes ? `Scanned via OCR | ${parsedNotes}` : 'Scanned via OCR',
                lastServiceDate: new Date().toISOString().split('T')[0]
            };

            const updatedVehicles = [newVehicle, ...vehicles];
            const scanEntry = {
                id: Date.now(),
                regNo: newVehicle.regNo,
                customerName: newVehicle.customerName,
                customerPhone: newVehicle.customerPhone,
                scannedAt: new Date().toISOString()
            };
            const updatedScans = [scanEntry, ...(data?.scannedVehicles || [])];
            if (onUpdateData) {
                onUpdateData({
                    vehicles: updatedVehicles,
                    lastScannedVehicle: { ...newVehicle, scannedAt: new Date().toISOString() },
                    scannedVehicles: updatedScans
                });
            } else {
                setVehicles(updatedVehicles);
            }
            setEditingId(newVehicle.id);
            setFormData({
                regNo: newVehicle.regNo,
                make: newVehicle.make,
                model: newVehicle.model,
                customerName: newVehicle.customerName,
                customerPhone: newVehicle.customerPhone,
                year: newVehicle.year,
                mileage: newVehicle.mileage,
                notes: newVehicle.notes
            });
            setIsModalOpen(true);
            setIsOcrOpen(false);
        } catch (err) {
            setOcrError('OCR failed. Please try again.');
        } finally {
            setIsOcrBusy(false);
        }
    };

    const stopOcrCamera = () => {
        if (ocrStreamRef.current) {
            ocrStreamRef.current.getTracks().forEach(track => track.stop());
            ocrStreamRef.current = null;
        }
    };

    const startOcrCamera = async () => {
        setOcrError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            ocrStreamRef.current = stream;
            if (ocrVideoRef.current) {
                ocrVideoRef.current.srcObject = stream;
                await ocrVideoRef.current.play();
            }
        } catch (err) {
            setOcrError('Camera permission denied or unavailable.');
        }
    };

    const handleCaptureFrame = async () => {
        if (!ocrVideoRef.current || !ocrCanvasRef.current) return;
        const video = ocrVideoRef.current;
        const canvas = ocrCanvasRef.current;
        const maxWidth = 960;
        const minWidth = 320;
        const sourceWidth = video.videoWidth || maxWidth;
        const sourceHeight = video.videoHeight || 720;
        const scale = Math.min(1, maxWidth / sourceWidth);
        const width = Math.max(Math.floor(sourceWidth * scale), minWidth);
        const height = Math.max(Math.floor(sourceHeight * (width / sourceWidth)), 80);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, width, height);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (blob) {
            await handleOcrFile(new File([blob], 'plate.jpg', { type: 'image/jpeg' }));
        }
    };

    useEffect(() => {
        if (isOcrOpen) {
            startOcrCamera();
        } else {
            stopOcrCamera();
        }
        return () => stopOcrCamera();
    }, [isOcrOpen]);

  return (
    <div className={`p-4 h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'} overflow-hidden`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-gray-200 dark:bg-slate-800 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Car className="text-blue-500" /> {t('Vehicle Master')}</h2>
        </div>
      </div>

      <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
              className={`w-full pl-10 p-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}
              placeholder="Search Reg No, Phone, Make..."
              value={search} onChange={e =>
                
                 setSearch(e.target.value)} />
                <div className="absolute right-12 top-1.5 z-10"><VoiceInput onResult={setSearch} isDark={isDark} /></div> 
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={16}/></button>}
      </div>

      <div className="grid gap-3 overflow-y-auto flex-1 pb-24">
        {filtered.length === 0 ? (
            <div className="text-center p-10 opacity-50"><Car size={48} className="mx-auto mb-2"/> <p>No vehicles found</p></div>
        ) : filtered.map(v => (
          <div 
              key={v.id} 
              onClick={() => handleOpenEdit(v)}
              className={`p-4 rounded-xl border cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div>
                  <h3 className="font-bold text-lg leading-tight uppercase bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 px-2 py-0.5 rounded inline-block border border-yellow-300 dark:border-yellow-700/50 mb-1">{v.regNo}</h3>
                  <p className="text-sm font-bold mt-1 text-blue-600 dark:text-blue-400">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</p>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-end border-t pt-3 dark:border-slate-700">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Customer</p>
                    <p className="text-sm font-bold flex items-center gap-1"><User size={14}/> {v.customerName}</p>
                    <p className="text-xs text-gray-500">{v.customerPhone}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Last Service</p>
                    <p className="text-sm font-bold flex items-center gap-1 justify-end text-gray-600 dark:text-gray-300">
                        <Calendar size={14}/> {v.lastServiceDate || 'N/A'}
                    </p>
                </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleOpenAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-600 active:scale-95 transition-all">
          <Plus size={26} />
      </button>

            <button
                onClick={() => setIsOcrOpen(true)}
                className="fixed bottom-6 right-24 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-emerald-600 active:scale-95 transition-all"
                title="Scan Plate"
            >
                <Camera size={24} />
            </button>

            {isOcrOpen && (
                <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-2xl p-5 ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-2xl animate-in zoom-in-95 duration-200`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <Camera className="text-emerald-500" /> Scan Plate (OCR)
                            </h3>
                            <button onClick={() => setIsOcrOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X /></button>
                        </div>

                        <p className="text-sm opacity-70 mb-4">Point the camera at the plate and tap Capture.</p>

                        <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black mb-4">
                            <video ref={ocrVideoRef} className="w-full h-full object-cover" playsInline muted />
                        </div>

                        <canvas ref={ocrCanvasRef} className="hidden" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={handleCaptureFrame}
                                disabled={isOcrBusy}
                                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-60"
                            >
                                {isOcrBusy ? 'Scanning...' : 'Capture Plate'}
                            </button>
                            <button
                                onClick={() => ocrInputRef.current?.click()}
                                disabled={isOcrBusy}
                                className={`w-full py-3 rounded-xl font-bold border transition-all ${isDark ? 'border-slate-700 text-slate-200' : 'border-gray-300 text-gray-700'}`}
                            >
                                Upload Photo
                            </button>
                        </div>

                        <input
                            ref={ocrInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleOcrFile(file);
                            }}
                        />

                        {ocrError && (
                            <div className="mt-4 text-sm text-red-500 font-semibold">{ocrError}</div>
                        )}

                        {ocrText && (
                            <div className="mt-4 text-xs opacity-70 whitespace-pre-wrap">{ocrText}</div>
                        )}
                    </div>
                </div>
            )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`w-full max-w-md rounded-2xl p-5 ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]`}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-xl flex items-center gap-2">
                        {editingId ? <Edit2 className="text-blue-500" /> : <Car className="text-blue-500"/>}
                        {editingId ? 'Edit Vehicle' : 'Add Vehicle'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X/></button>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Reg No (e.g. MH01AB1234)*</label>
                          <input className={`w-full p-3 rounded-xl border font-bold uppercase ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Registration Number" value={formData.regNo} onChange={e => setFormData({...formData, regNo: e.target.value})} />
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Make</label>
                            <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Honda, Maruti..." value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Model</label>
                            <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="City, Swift..." value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Year</label>
                            <input type="number" className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="2018" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                        </div>
                        <div className="flex-[1.5]">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Mileage (KMs)</label>
                            <input type="number" className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="45000" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} />
                        </div>
                      </div>

                      <div className="pt-2 border-t dark:border-slate-700"></div>
                      
                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Customer Name*</label>
                          <input className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Customer Name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Phone Number</label>
                          <input type="tel" className={`w-full p-3 rounded-xl border font-medium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Phone Number" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Notes / Issues</label>
                          <textarea className={`w-full p-3 rounded-xl border font-medium resize-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} placeholder="Dents, specific requirements..." rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                      </div>

                      <button 
                        onClick={handleSubmit} 
                        disabled={!formData.regNo || !formData.customerName}
                        className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all mt-4 disabled:opacity-50"
                      >
                          {editingId ? 'Update Vehicle' : 'Save Vehicle'}
                      </button>
                      
                      {editingId && (
                          <button 
                              onClick={() => {
                                  if(confirm('Are you sure you want to delete this vehicle?')) {
                                      setVehicles(vehicles.filter(v => v.id !== editingId));
                                      setIsModalOpen(false);
                                  }
                              }} 
                              className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-all mt-2"
                          >
                              Delete Vehicle
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};


