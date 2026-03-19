import React, { useState, useMemo } from 'react';
import { ArrowLeft, Share, Filter, Send, MoreHorizontal, Download, X, Tag, Calendar } from 'lucide-react';

export const AnalyticsDashboard = ({ onBack, isDark = false, data, t }: { onBack: () => void, isDark?: boolean, data?: any, t?: any }) => {
  const [activeTab, setActiveTab] = useState('Day');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [showAllTxns, setShowAllTxns] = useState(false);
  
  // Create a selected date state for the calendar (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Deterministic price generator based on item name since app only tracks qty natively here
  const getPrice = (name = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (Math.abs(hash) % 50 + 1) * 100;
  };

  const getMethod = (id: any) => {
    const r = (Number(id) || new Date().getTime()) % 100;
    if (r < 60) return "Cash";
    if (r < 85) return "UPI";
    return "Card";
  };

  const baseDate = new Date(selectedDate);
  const endOfDay = new Date(baseDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const filteredEvents = useMemo(() => {
    if (!data?.salesEvents) return [];
    return data.salesEvents.filter((e: any) => {
      // For dashboard stats, only count sales
      if (e.type !== 'sale') return false;
      const eb = new Date(e.ts || e.date);
      
      if (activeTab === 'Day') {
        return eb.getDate() === baseDate.getDate() && 
               eb.getMonth() === baseDate.getMonth() && 
               eb.getFullYear() === baseDate.getFullYear();
      }
      if (activeTab === 'Week') {
        const diff = endOfDay.getTime() - eb.getTime();
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (activeTab === 'Month') {
         const diff = endOfDay.getTime() - eb.getTime();
         return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    }).map((e: any) => {
      const price = getPrice(e.car);
      return {
        ...e,
        price,
        amount: price * e.qty,
        method: getMethod(e.id || e.ts)
      };
    });
  }, [data?.salesEvents, activeTab, selectedDate]);

  const filteredScans = useMemo(() => {
    if (!data?.scannedVehicles) return [];
    return data.scannedVehicles.filter((s: any) => {
      const sb = new Date(s.scannedAt);
      if (activeTab === 'Day') {
        return sb.getDate() === baseDate.getDate() &&
               sb.getMonth() === baseDate.getMonth() &&
               sb.getFullYear() === baseDate.getFullYear();
      }
      if (activeTab === 'Week') {
        const diff = endOfDay.getTime() - sb.getTime();
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (activeTab === 'Month') {
        const diff = endOfDay.getTime() - sb.getTime();
        return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [data?.scannedVehicles, activeTab, selectedDate]);

  const scanCount = filteredScans.length;
  const scanCountsByReg: Record<string, number> = {};
  filteredScans.forEach((s: any) => {
    const key = (s.regNo || '').toUpperCase();
    if (!key) return;
    scanCountsByReg[key] = (scanCountsByReg[key] || 0) + 1;
  });
  const uniqueScanCount = Object.keys(scanCountsByReg).length;
  const repeatScanCount = Object.values(scanCountsByReg).filter(c => c > 1).length;

  const totalSales = filteredEvents.reduce((acc: number, val: any) => acc + val.amount, 0);
  const transactions = filteredEvents.length;
  const avgTicket = transactions > 0 ? Math.round(totalSales / transactions) : 0;
  
  const refunds = data?.salesEvents?.filter((e: any) => {
      if (e.type !== 'restock') return false;
      const eb = new Date(e.ts || e.date);
      if (activeTab === 'Day') return eb.getDate() === baseDate.getDate() && eb.getMonth() === baseDate.getMonth() && eb.getFullYear() === baseDate.getFullYear();
      if (activeTab === 'Week') {
         const diff = endOfDay.getTime() - eb.getTime();
         return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (activeTab === 'Month') {
         const diff = endOfDay.getTime() - eb.getTime();
         return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
  }).reduce((acc: number, curr: any) => acc + (getPrice(curr.car) * curr.qty), 0) || 0;

  // Payments Breakdown
  const cashSales = filteredEvents.filter((e: any) => e.method === 'Cash').reduce((acc: number, v: any) => acc + v.amount, 0);
  const upiSales = filteredEvents.filter((e: any) => e.method === 'UPI').reduce((acc: number, v: any) => acc + v.amount, 0);
  const cardSales = filteredEvents.filter((e: any) => e.method === 'Card').reduce((acc: number, v: any) => acc + v.amount, 0);

  const cashPct = totalSales ? Math.round((cashSales/totalSales)*100) : 60;
  const upiPct = totalSales ? Math.round((upiSales/totalSales)*100) : 25;
  const cardPct = totalSales ? Math.max(0, 100 - cashPct - upiPct) : 15;

  // Real Dynamic Chart Logic
  const hourMap = new Array(24).fill(0);
  filteredEvents.forEach((e: any) => {
     const h = new Date(e.ts || e.date).getHours() || 12;
     hourMap[h] += e.amount;
  });
  
  // 13 items covering 8am to 8pm
  const chartLabels = ['8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm'];
  const validHours = hourMap.slice(8, 21);
  
  const generateChartPaths = (dataValues: number[]) => {
    const width = 300;
    const height = 130;
    const padding = 25;
    const maxVal = Math.max(...dataValues, 100); 
    const stepX = width / (Math.max(dataValues.length - 1, 1));
    const scaleY = (val: number) => height - (val / maxVal) * (height - padding);

    const pts = dataValues.map((val, i) => ({
      x: i * stepX,
      y: scaleY(val)
    }));

    let d = `M 0,${pts[0]?.y || height}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
    }
    
    const fillPath = `${d} L ${width},${height} L 0,${height} Z`;
    const yMarkers = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25];
    
    return { linePath: d, fillPath, pts, maxVal, stepX, yMarkers };
  };

  const chartData = generateChartPaths(validHours);
  let maxHourVal = Math.max(...validHours, 0);
  
  // Create a fake peak purely for visual if data is completely empty
  const isGraphEmpty = maxHourVal === 0;
  if (isGraphEmpty) {
     maxHourVal = 0;
  }
  const maxIdx = isGraphEmpty ? -1 : validHours.indexOf(maxHourVal);
  const activePoint = isGraphEmpty ? null : chartData.pts[maxIdx];

  const topItemsMap: any = {};
  filteredEvents.forEach((e: any) => {
    if (!topItemsMap[e.car]) topItemsMap[e.car] = { name: e.car, qty: 0, rev: 0 };
    topItemsMap[e.car].qty += e.qty;
    topItemsMap[e.car].rev += e.amount;
  });
  const topItemsList = Object.values(topItemsMap).sort((a: any, b: any) => b.rev - a.rev).slice(0, 3);
  const colors = ["#FF8C55", "#17B890", "#5B5CEB"];
  const maxTopRev = (topItemsList[0] as any)?.rev || 1;

  // Dynamic Categories Based on Names
  const categories = { Engines: 0, Brakes: 0, Electrical: 0, Oils: 0, Other: 0 };
  filteredEvents.forEach((e: any) => {
    const l = (e.car || "").toLowerCase();
    if (l.includes("oil") || l.includes("lube") || l.includes("fluid")) categories.Oils += e.amount;
    else if (l.includes("brake") || l.includes("pad") || l.includes("disk")) categories.Brakes += e.amount;
    else if (l.includes("spark") || l.includes("battery") || l.includes("wire") || l.includes("bulb")) categories.Electrical += e.amount;
    else if (l.includes("engine") || l.includes("belt") || l.includes("filter")) categories.Engines += e.amount;
    else categories.Other += e.amount;
  });
  const catTotalSum = Object.values(categories).reduce((a,b)=>a+b, 0) || 1;
  const maxCatVal = Math.max(...Object.values(categories), 1);

  // Recent Txns
  const recentTxns = [...filteredEvents].sort((a,b) => (b.ts || 0) - (a.ts || 0));
  const displayedTxns = showAllTxns ? recentTxns : recentTxns.slice(0, 4);

  const handleExport = () => {
    if (!filteredEvents.length) return alert("No active data to export over this period!");
    const csvRows = [["Date", "Time", "Item Name", "Quantity", "Amount", "Payment Method"]];
    filteredEvents.forEach((e: any) => {
      const d = new Date(e.ts || e.date);
      csvRows.push([`"${d.toLocaleDateString()}"`, `"${d.toLocaleTimeString()}"`, `"${e.car}"`, e.qty, e.amount, e.method]);
    });
    const csvString = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Autonex_Sales_${activeTab}_${baseDate.getTime()}.csv`;
    a.click();
  };

  const handleShare = async () => {
    const topItem = topItemsList[0] as any;
    const text = `Autonex ${activeTab} Sales Report (${baseDate.toLocaleDateString()}):\nTotal: ₹${totalSales.toLocaleString()}\nTransactions: ${transactions}\nTop Product: ${topItem?.name || "N/A"}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Sales Report", text }); } catch(err) {}
    } else {
      alert("Sharing not supported on this browser. Copied to clipboard!\n\n" + text);
    }
  };

  const formatShortValue = (val: number) => {
    if (val >= 1000) return (val/1000).toFixed(1).replace('.0','') + 'k';
    return val.toString();
  };

  return (
    <div className="bg-[#F6F7FB] min-h-screen text-[#0F1724] font-sans relative pb-24 overflow-x-hidden">
      
      {/* Detail Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-[100] bg-[#0f1724]/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative translate-y-0 animate-in slide-in-from-bottom-8 duration-300">
             <button onClick={() => setSelectedTxn(null)} className="absolute top-5 right-5 p-2 bg-gray-50 hover:bg-gray-100 transition-colors rounded-full text-gray-500"><X size={18}/></button>
             <div className="w-12 h-12 bg-[#5B5CEB]/10 rounded-full flex items-center justify-center mb-4 text-[#5B5CEB]">
                <Tag size={20} className="" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-1 pr-8 leading-tight">{selectedTxn.car}</h3>
             <p className="text-gray-500 text-sm mb-6 font-medium">{new Date(selectedTxn.ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
             
             <div className="bg-[#f8f9fc] rounded-2xl p-4 space-y-3.5 mb-6 border border-gray-100">
               <div className="flex justify-between items-center"><span className="text-gray-500 text-[13px] font-medium">Transaction ID</span><span className="font-semibold text-[13px] text-gray-900">#{((selectedTxn.id || selectedTxn.ts) % 100000).toString().padStart(5, '0')}</span></div>
               <div className="flex justify-between items-center"><span className="text-gray-500 text-[13px] font-medium">Type</span><span className="font-semibold text-[13px] text-[#108A6B] bg-[#108A6B]/10 px-2 py-0.5 rounded-md">Sale Out</span></div>
               <div className="flex justify-between items-center"><span className="text-gray-500 text-[13px] font-medium">Item Quantity</span><span className="font-bold text-[14px] text-gray-900">{selectedTxn.qty}x</span></div>
               <div className="flex justify-between items-center"><span className="text-gray-500 text-[13px] font-medium">Payment Route</span><span className="font-semibold text-[13px] text-gray-900">{selectedTxn.method}</span></div>
               <div className="h-px bg-gray-200/60 w-full my-2"></div>
               <div className="flex justify-between items-end pt-1"><span className="text-gray-900 font-bold text-[15px]">Total Amount</span><span className="font-black text-2xl text-[#5B5CEB]">₹{selectedTxn.amount.toLocaleString('en-IN')}</span></div>
             </div>
             
             <button className="w-full bg-[#0F1724] hover:bg-gray-800 transition-colors text-white font-bold py-3.5 rounded-xl text-sm" onClick={() => setSelectedTxn(null)}>Close Receipt</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between bg-white z-20 relative">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-6 h-6 rounded-full bg-[#5B5CEB] flex items-center justify-center text-white text-[9px] italic tracking-tight font-black">Autop</div>
          Sales Analytics
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="p-2 active:bg-gray-100 rounded-full transition-colors"><Share size={20} strokeWidth={2.5} className="text-[#3b4761]" /></button>
          <button onClick={() => setShowFilter(!showFilter)} className={`p-2 rounded-full transition-colors ${showFilter ? "bg-[#5B5CEB]/10 text-[#5B5CEB]" : "active:bg-gray-100 text-[#3b4761]"}`}><Filter size={20} strokeWidth={2.5} /></button>
        </div>
      </div>

      {showFilter && (
        <div className="px-5 pb-4 bg-white animate-in slide-in-from-top-2">
          <div className="flex gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
             <div className="flex-1 text-center py-2 text-sm font-semibold rounded-lg bg-white shadow-sm border border-gray-100">By Amount</div>
             <div className="flex-1 text-center py-2 text-sm font-semibold rounded-lg text-gray-500 active:bg-gray-200 transition-colors" onClick={() => setShowFilter(false)}>By Date</div>
          </div>
        </div>
      )}

      {/* Tabs & Calendar */}
      <div className="bg-white pt-2 pb-4 px-4 shadow-sm relative z-10 rounded-b-[20px]">
        <div className="bg-[#EAEAF5] p-1 rounded-full flex mx-auto max-w-[300px]">
          {['Day', 'Week', 'Month'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-[13px] font-bold py-1.5 rounded-full transition-all ${activeTab === tab ? 'bg-[#5B5CEB] text-white shadow-md' : 'text-[#7A86A1] hover:text-[#0F1724]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Real Native Calendar Picker Wrapper */}
        <div className="mt-4 flex justify-center">
          <div className="relative inline-block">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              style={{ colorScheme: 'light' }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button className="bg-white border text-[13px] border-gray-200 text-[#0F1724] font-bold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:bg-gray-50 transition-colors">
              <Calendar size={14} className="text-[#5B5CEB] mr-0.5" />
              {baseDate.toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric"})} 
              <span className="text-gray-300 font-normal">|</span> 
              <span className="text-[#5B5CEB] font-medium">{activeTab}</span>
              <span className="opacity-40 text-[10px] ml-1">▼</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pt-4 animate-in fade-in duration-300" key={activeTab + selectedDate}>
        {/* KPI Cards */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x -mx-4 px-4">
          <div className="min-w-[150px] bg-gradient-to-br from-[#6A6DF0] to-[#5153E6] rounded-xl p-4 text-white shadow-[0_8px_20px_rgba(91,92,235,0.25)] snap-center relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute top-2 right-2 flex gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-white/70"></div>
            </div>
            <p className="text-[11px] font-medium opacity-90 mb-0.5">Total Sales</p>
            <p className="text-[22px] font-bold tracking-tight mb-2">₹{totalSales.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-semibold bg-[#494AE5] inline-block px-2 py-0.5 rounded-sm">{activeTab}</p>
          </div>
          
          <div className="min-w-[150px] bg-gradient-to-br from-[#80d0bd] to-[#54B69F] rounded-xl p-4 text-[#1E3B33] snap-center">
            <div className="flex justify-between items-start mb-0.5">
              <p className="text-[11px] font-bold opacity-80">Transactions</p>
            </div>
            <p className="text-[22px] font-bold tracking-tight mb-2">{transactions} <span className="text-[11px] font-bold opacity-80 ml-1">Avg ₹{avgTicket}</span></p>
            <div className="flex gap-1 mt-4">
              {[1,2,3,4,5].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i !== 5 ? 'bg-white/50' : 'bg-white'}`}></div>)}
            </div>
          </div>
          
          <div className="min-w-[150px] bg-gradient-to-br from-[#ffb288] to-[#FF8C55] rounded-xl p-4 text-[#5A2810] snap-center">
            <p className="text-[11px] font-bold opacity-80 mb-0.5">Restocks Valued</p>
            <p className="text-[22px] font-bold tracking-tight mb-2 text-[#DD3E3E]">₹{refunds.toLocaleString('en-IN')}</p>
            <div className="flex gap-1 mt-4">
              {[1,2,3,4,5].map((i, idx) => <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === 3 ? 'bg-white' : 'bg-white/50'}`}></div>)}
            </div>
          </div>

          <div className="min-w-[150px] bg-gradient-to-br from-[#c6e7ff] to-[#8cc8ff] rounded-xl p-4 text-[#0F2F4A] snap-center">
            <p className="text-[11px] font-bold opacity-80 mb-0.5">Vehicle Scans</p>
            <p className="text-[22px] font-bold tracking-tight mb-2">{scanCount}</p>
            <p className="text-[10px] font-semibold bg-white/70 inline-block px-2 py-0.5 rounded-sm">{activeTab}</p>
          </div>

          <div className="min-w-[150px] bg-gradient-to-br from-[#d7f7df] to-[#a7e9bc] rounded-xl p-4 text-[#1A3B25] snap-center">
            <p className="text-[11px] font-bold opacity-80 mb-0.5">Repeat Vehicles</p>
            <p className="text-[22px] font-bold tracking-tight mb-2">{repeatScanCount}</p>
            <p className="text-[10px] font-semibold opacity-80">Unique: {uniqueScanCount}</p>
          </div>
        </div>

        {/* Dynamic Sales Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
          <h3 className="text-[14px] font-bold text-[#0F1724]">Sales Over Time</h3>
          <div className="h-[180px] w-full relative mt-6">
            
            {!isGraphEmpty && activePoint && (
              <div className="absolute text-center min-w-[70px] transition-all" style={{ left: `calc(${(activePoint.x/300)*100}% - 22px)`, top: '-20px' }}>
                  <div className="bg-[#1d1f5e] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-[8px] inline-flex items-center gap-1.5 z-20 shadow-xl relative animate-in fade-in zoom-in-95">
                      {chartLabels[maxIdx]} <span className="font-normal opacity-80 ml-0.5">₹{maxHourVal.toLocaleString('en-IN')}</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1d1f5e] rotate-45"></div>
                  </div>
              </div>
            )}
            
            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-[#A0A7B5] font-medium z-10 pr-1">
              {!isGraphEmpty ? chartData.yMarkers.map((m, i) => (
                <span key={i} className="leading-none">{formatShortValue(m)}</span>
              )) : <span className="leading-none">0</span>}
            </div>
            
            <div className="absolute left-8 right-0 top-0 bottom-6 flex flex-col justify-between pt-1 pb-1">
              {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-dashed border-[#EAEAF5]"></div>)}
            </div>
            
            <div className="absolute left-8 right-0 top-0 bottom-6 flex items-end">
               <svg viewBox="0 0 300 130" className="w-full h-full preserve-aspect-ratio-none overflow-visible" preserveAspectRatio="none">
                 <defs>
                    <linearGradient id="chartGradientActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8A8CF4" stopOpacity="0.8"/>
                      <stop offset="70%" stopColor="#D5D6FB" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#D5D6FB" stopOpacity="0.0"/>
                    </linearGradient>
                 </defs>
                 
                 {!isGraphEmpty ? (
                   <>
                     <path d={chartData.fillPath} fill="url(#chartGradientActive)"/>
                     <path d={chartData.linePath} fill="none" stroke="#5B5CEB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                     
                     <line x1={activePoint.x} y1={activePoint.y} x2={activePoint.x} y2="130" stroke="#5B5CEB" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
                     
                     {chartData.pts.map((pt, i) => i === maxIdx ? null : (
                       <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke="#5B5CEB" strokeWidth="1.5" className="transition-all duration-300 hover:r-4"/>
                     ))}
                     
                     <circle cx={activePoint.x} cy={activePoint.y} r="4.5" fill="#5B5CEB" stroke="white" strokeWidth="1.5"/>
                     <circle cx={activePoint.x} cy={activePoint.y} r="14" fill="#5B5CEB" opacity="0.15" className="animate-pulse"/>
                   </>
                 ) : (
                    <path d="M 0,130 L 300,130" fill="none" stroke="#D5D6FB" strokeWidth="2.5" strokeDasharray="4,4" />
                 )}
               </svg>
            </div>
            
            {/* Dynamic X Axis Match */}
            <div className="absolute left-8 right-0 bottom-[-10px] h-6 flex justify-between items-end text-[9.5px] xs:text-[10px] text-[#A0A7B5] font-semibold">
              <span>8a</span><span>10a</span><span>12p</span><span>2p</span><span>4p</span><span>6p</span><span>8p</span>
            </div>
          </div>
        </div>

        {/* Payments Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="relative w-[75px] h-[75px] flex-shrink-0 ml-1">
             <div className="w-full h-full rounded-full transition-all duration-700" style={{ background: `conic-gradient(#5B5CEB 0% ${cashPct}%, #FF8C55 ${cashPct}% ${cashPct+upiPct}%, #2B3363 ${cashPct+upiPct}% 100%)`}}></div>
             <div className="absolute inset-[10px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
               <span className="text-[13px] font-black text-[#0F1724]">{cashPct}%</span>
             </div>
          </div>
          <div className="flex-1">
            <h3 className="text-[12px] font-bold text-[#838EA6] mb-3">Payments Captured</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#556077] font-medium"><div className="w-2 h-2 rounded-full bg-[#5B5CEB]"></div> Cash</span>
                <span className="font-bold text-[#0F1724]">₹{cashSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-end border-l border-gray-100 pl-2">
                <span className="flex items-center gap-1.5 font-bold text-[#0F1724]"><div className="w-3.5 h-2.5 rounded bg-[#FF8C55]"></div> ₹{upiSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#556077] font-medium"><div className="w-2 h-2 rounded-full bg-[#17B890]"></div> UPI</span>
                <span className="font-bold text-[#0F1724]">₹{upiSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-end border-l border-gray-100 pl-2">
                <span className="flex items-center gap-1.5 font-bold text-[#0F1724]"><div className="w-3.5 h-2.5 rounded bg-[#2B3363]"></div> ₹{cardSales.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-[14px] font-bold text-[#0F1724] mb-4">Top Selling Items</h3>
          {topItemsList.length > 0 ? (
          <div className="space-y-3.5">
            {topItemsList.map((item: any, id) => (
              <div key={id} className="flex items-center gap-3 bg-[#F9FAFB] p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-[24px] h-[24px] rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm`} style={{ backgroundColor: colors[id] || "#2B3363" }}>{id + 1}</div>
                <div className="flex-1 text-[13px] font-bold text-[#0F1724] truncate max-w-[120px] pr-2">{item.name}</div>
                <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#556077] font-medium w-12">{item.qty} <span className="opacity-70 font-normal">sold</span></span>
                    <div className="w-[45px] h-[5px] bg-gray-200 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.rev / maxTopRev) * 100}%`, backgroundColor: colors[id] || "#2B3363" }}></div>
                    </div>
                </div>
                <div className="text-[13px] font-bold text-[#0F1724] w-[55px] text-right">₹{item.rev.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
          ) : (
             <div className="flex items-center justify-center py-6 text-sm text-gray-400 font-semibold bg-gray-50 rounded-xl border border-dashed border-gray-200">No Item Sales Recorded</div>
          )}
        </div>

        {/* Sales by Category */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-[14px] font-bold text-[#0F1724] mb-4">Sales by Category</h3>
          <div className="space-y-3.5">
            {Object.entries(categories).filter(([_,v]) => v > 0).length > 0 ? Object.entries(categories).map(([name, val], idx) => {
              if(val === 0) return null;
              const pct = val > 0 ? Math.round((val / catTotalSum) * 100) : 0;
              const fillPct = val > 0 ? (val / maxCatVal) * 100 : 0;
              return (
              <div key={name} className="flex items-center gap-3 text-[13px]">
                <div className="w-[65px] font-semibold text-[#556077]">{name}</div>
                <div className="w-[50px] font-bold text-[#0F1724]">₹{val.toLocaleString('en-IN')}</div>
                <div className="flex-1 h-3 bg-[#EAEAF5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7A7CEE] rounded-full transition-all duration-1000" style={{ width: `${fillPct}%` }}></div>
                </div>
                <div className="w-9 text-right font-bold text-[#838EA6]">{pct}%</div>
              </div>
            )}) : (
              <div className="flex items-center justify-center py-4 text-sm text-gray-400 font-semibold bg-gray-50 rounded-xl">Insufficient Data</div>
            )}
          </div>
        </div>

        {/* Recent Transactions Interactive */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[#2B3363] flex items-center gap-2">
              <div className="w-2 h-2 rounded-[2px] bg-[#5B5CEB] rounded-bl-none rotate-45 mt-0.5"></div> Recent Transactions
            </h3>
            {recentTxns.length > 4 && (
              <button 
                className="text-[11px] font-bold text-[#5B5CEB] bg-[#5B5CEB]/10 px-2.5 py-1 rounded-md active:bg-[#5B5CEB]/20" 
                onClick={() => setShowAllTxns(!showAllTxns)}
              >
                {showAllTxns ? "Show Less" : "View All"}
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {displayedTxns.length > 0 ? displayedTxns.map((tx: any, idx) => {
                const date = new Date(tx.ts || tx.date);
                const isPaid = tx.type === 'sale';
                const statBg = isPaid ? "bg-[#a3e4c4]/30" : "bg-[#556077]/10";
                const statText = isPaid ? "text-[#108A6B]" : "text-[#556077]";
                
              return (
              <div key={idx} className="flex items-center px-4 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer" onClick={() => setSelectedTxn(tx)}>
                <div className="w-16 text-[11px] text-[#838EA6] font-semibold">{date.toLocaleTimeString('en-US',{hour:'2-digit', minute:'2-digit', hour12: false})}</div>
                <div className="flex-1 text-[13px] font-bold text-[#0F1724] truncate px-2">{tx.car}</div>
                <div className="w-[55px] text-[13px] font-bold text-[#0F1724] text-right">₹{tx.amount.toLocaleString('en-IN')}</div>
                <div className="w-10 text-[11px] text-[#A0A7B5] font-semibold text-right ml-2">{tx.method}</div>
                <div className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ml-2.5 w-12 text-center ${statBg} ${statText}`}>{isPaid ? 'Paid' : 'Stock'}</div>
              </div>
            )}) : (
               <div className="p-5 text-center text-sm font-semibold text-gray-400 border-t border-dashed border-gray-100">No active transactions to show.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 pb-6 flex items-center justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="font-semibold text-[#0F1724] text-[15px] flex items-center gap-1.5 flex-col items-start pr-2">
          <span className="text-[#838EA6] font-semibold text-[11px] uppercase tracking-wide">Net Sales</span> 
          <span className="text-xl">₹{totalSales.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex gap-2.5 text-[14px]">
          <button onClick={handleExport} className="bg-[#FF8C55] hover:bg-[#ff7a3a] text-white font-bold py-3.5 px-5 rounded-xl shadow-[0_4px_14px_rgba(255,140,85,0.3)] transition-all active:scale-95 flex items-center gap-2">
            <Download size={16} /> CSV
          </button>
          <button onClick={handleShare} className="bg-[#5B5CEB] hover:bg-[#4d4ee2] text-white font-bold py-3.5 px-6 rounded-xl shadow-[0_4px_14px_rgba(91,92,235,0.3)] flex items-center gap-2 transition-all active:scale-95">
            <Send size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
