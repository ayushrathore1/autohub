import React, { useState, useEffect } from "react";
import { ArrowLeft, Share2, MoreVertical, Calendar, Phone, Search, ScanBarcode, User, Plus, Trash2, Edit2, FileText, ChevronDown, Percent, Package, X, CheckCircle, Smartphone, CheckCircle2, MessageSquare, Download, Camera, XCircle, Loader2 } from "lucide-react";

export const InvoicePro = ({ onBack, shopName, t, data }) => {
  const [invoiceNumber] = useState(Date.now().toString().slice(-6));
  const [date] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [customerType, setCustomerType] = useState("Walk-in Customer");
  const [mobile, setMobile] = useState("");
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);

  const [toast, setToast] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", qty: 1, rate: 0, gst: 18 });
  
  const filteredInventory = React.useMemo(() => { if (!data || !data.pages) return []; return data.pages.filter(p => p.itemName && p.itemName.toLowerCase().includes((newItem.name || "").toLowerCase())); }, [data, newItem.name]);

const [items, setItems] = useState([]);

  const subtotal = items.reduce((acc, item) => acc + (item.rate * item.qty), 0);
  const totalGst = items.reduce((acc, item) => acc + (item.amount - (item.rate * item.qty)), 0);
  const total = subtotal + totalGst;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowSuccessCard(true);
    }, 1200);
  };

  const handleScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setItems([...items, { id: Date.now(), name: "Scanned Spark Plug", hsn: "8511", gst: 28, rate: 250, qty: 1, amount: 320 }]);
      showToast("Scanned Item Added successfully!");
    }, 2000);
  };

  const shareText = `Bill from ${shopName || "Our Shop"}\nInv No: #${invoiceNumber}\nAmount: ₹${total.toFixed(2)}\nDate: ${date}\nThank you for shopping!`;

  const handleShareWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleShareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_self');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoiceNumber}`,
          text: shareText,
        });
      } catch (err) {}
    } else {
      setShowShareOptions(true);
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.rate) {
      showToast("Please enter item name and rate!");
      return;
    }
    const rate = parseFloat(newItem.rate);
    const amount = (rate * newItem.qty) * (1 + (newItem.gst / 100));
    setItems([...items, { ...newItem, rate, amount, id: Date.now(), hsn: "0000" }]);
    setNewItem({ name: "", qty: 1, rate: 0, gst: 18 });
    showToast("Item added successfully!");
  };

  const deleteItem = (id) => {
    setItems(items.filter(i => i.id !== id));
    showToast("Item removed");
  };
  
  return (
    <div className="flex flex-col h-full bg-[#F6F7FB] font-sans relative overflow-hidden animate-in fade-in duration-300">
      
      {/* Toast Notification Top */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl z-[100] text-[14px] font-medium animate-in fade-in slide-in-from-top-4 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Scanner Loading Visual Modal */}
      {isScanning && (
        <div className="absolute inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
             <div className="text-white mb-10 text-[18px] font-bold flex items-center gap-2">
                 <Camera className="animate-pulse" /> Scanning Barcode...
             </div>
             <div className="relative w-64 h-64 border-2 border-white/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)] bg-black/50 backdrop-blur-md">
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#22c55e] animate-ping shadow-[0_0_15px_#22c55e]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#22c55e]/10 to-transparent"></div>
             </div>
             <button onClick={() => setIsScanning(false)} className="mt-16 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full text-white backdrop-blur-md font-medium flex items-center gap-2 transition-all">
                <XCircle size={20} /> Cancel Scan
             </button>
        </div>
      )}

      {/* Share Actions Standard Modal Layer */}
      {showShareOptions && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end justify-center animate-in fade-in backdrop-blur-sm" onClick={() => setShowShareOptions(false)}>
          <div className="bg-white w-full rounded-t-[24px] p-6 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[18px] font-bold text-[#0F1724]">Share Options</h3>
              <button onClick={() => setShowShareOptions(false)} className="p-2 bg-gray-100 rounded-full text-gray-600"><X size={20}/></button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
               <button onClick={handleShareWhatsapp} className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all">
                  <div className="w-14 h-14 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center"><MessageSquare size={28} /></div>
                  <span className="text-[13px] font-semibold text-gray-700">WhatsApp</span>
               </button>
               <button onClick={handleShareSMS} className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><MessageSquare size={28} /></div>
                  <span className="text-[13px] font-semibold text-gray-700">Messages</span>
               </button>
               <button onClick={() => { showToast("Downloading PDF..."); setShowShareOptions(false); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all">
                  <div className="w-14 h-14 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center"><Download size={28} /></div>
                  <span className="text-[13px] font-semibold text-gray-700">Download</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-[0_4px_20px_rgba(15,20,36,0.04)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors active:scale-90">
            <ArrowLeft size={24} className="text-[#0F1724]" />
          </button>
          <div>
            <h1 className="text-[18px] font-semibold text-[#0F1724]">Invoice Pro</h1>
            <p className="text-[13px] text-[#556077]">#{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowShareOptions(true)} className="flex items-center gap-1.5 bg-[#5B5CEB] hover:bg-[#4A4BDB] text-white px-3 py-1.5 rounded-full font-medium text-[14px] transition-all shadow-md shadow-indigo-200 active:scale-95">
            <Share2 size={16} />
            <span>Share</span>
          </button>
          
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-52 hide-scrollbar">
        {/* Identity Card */}
        <div className="bg-white rounded-[16px] p-4 shadow-[0_6px_20px_rgba(15,20,36,0.06)] border border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-[#5B5CEB] uppercase tracking-wide">{shopName || "AUTONEX"}</h2>
            <p className="text-[13px] text-[#556077]">Retail Invoice</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={() => showToast("Tap to open Device Calendar...")} className="flex items-center gap-1.5 bg-[#F6F7FB] active:bg-gray-200 text-[#556077] px-3 py-1 rounded-lg text-[13px] font-medium transition-colors">
              <Calendar size={14} />
              {date}
            </button>
            <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-1.5 bg-[#E6FBF2] active:bg-[#d1f5e5] text-[#17B890] px-3 py-1 rounded-lg text-[13px] font-bold shadow-sm transition-colors cursor-pointer">
              <span className="w-4 h-4 bg-[#17B890] rounded-full text-white flex items-center justify-center text-[10px]">₹</span>
              {paymentMode}
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Customer Section */}
        <div className="bg-white rounded-[16px] p-4 shadow-[0_6px_20px_rgba(15,20,36,0.06)] border border-gray-50">
          <div className="flex justify-between items-center mb-3">
            <label className="text-[14px] text-[#556077] font-medium">Customer</label>
            <button onClick={() => setShowCustomerModal(true)} className="flex items-center gap-1 text-[15px] font-semibold text-[#0F1724] active:opacity-70 cursor-pointer">
              {customerType} <ChevronDown size={16} className="text-[#556077]"/>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative flex items-center">
              <div className="absolute left-3 text-[#17B890]">
                <Phone size={18} />
              </div>
              <input 
                type="tel" 
                placeholder="Mobile Number (Optional)"
                className="w-full bg-[#F6F7FB] border border-gray-100 rounded-[12px] py-3 pl-10 pr-4 text-[14px] text-[#0F1724] focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/20 transition-all font-medium placeholder-[#556077]/60"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
              />
            </div>
            <button onClick={() => showToast("Opening Device Address Book...")} className="w-[46px] h-[46px] rounded-[12px] bg-[#F0EEFF] text-[#5B5CEB] flex items-center justify-center shrink-0 shadow-sm border border-[#E0DDFF] active:scale-95 transition-transform">
              <User size={20} />
            </button>
          </div>
        </div>

        {/* Add Item Form */}
        <div className="bg-white rounded-[16px] shadow-[0_6px_20px_rgba(15,20,36,0.06)] border border-gray-50 p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#556077]" />
              <input 
                placeholder="Search item or Scan Barcode"
                className="w-full bg-white border border-gray-200 rounded-[12px] py-3 pl-10 pr-4 text-[14px] text-[#0F1724] focus:outline-none focus:border-[#5B5CEB] transition-all shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleScanner} className="w-[48px] h-[48px] rounded-[12px] bg-gradient-to-r from-[#6B46FF] to-[#5B5CEB] text-white flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(91,92,235,0.3)] active:scale-95 transition-transform">
              <ScanBarcode size={22} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
             <div className="flex-1 min-w-[120px]">
                <div className="relative">
                  <input
                    placeholder="Item Name"
                    className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#5B5CEB]"
                    value={newItem.name}
                    onChange={e => { setNewItem({...newItem, name: e.target.value}); setShowItemDropdown(true); }}
                    onFocus={() => setShowItemDropdown(true)}
                  />
                  {showItemDropdown && (newItem.name) && filteredInventory.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
                      {filteredInventory.map(page => (
                         <div 
                           key={page.id}
                           className="p-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                           onClick={() => {
                             const defaultPrice = page.purchases && page.purchases.length > 0 ? page.purchases[0].price : 0;
                             setNewItem({ ...newItem, name: page.itemName, rate: defaultPrice });
                             setShowItemDropdown(false);
                           }}
                         >
                           <div className="text-[13px] font-semibold text-[#0F1724]">{page.itemName}</div>
                         </div>
                      ))}
                    </div>
                  )}
                  </div>
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
               <div className="w-[60px]">
                 <label className="text-[10px] text-[#556077] font-semibold mb-1 block">Qty</label>
                 <input type="number" 
                    className="w-full border border-gray-200 rounded-[8px] px-2 py-2 text-[14px] outline-none text-center"
                    value={newItem.qty || ""} onChange={e => setNewItem({...newItem, qty: parseInt(e.target.value) || 0})}
                 />
               </div>
               <div className="w-[80px]">
                 <label className="text-[10px] text-[#556077] font-semibold mb-1 block">Rate ₹</label>
                 <input type="number" 
                    className="w-full border border-gray-200 rounded-[8px] px-2 py-2 text-[14px] outline-none"
                    value={newItem.rate || ""} onChange={e => setNewItem({...newItem, rate: parseFloat(e.target.value) || 0})}
                 />
               </div>
               <div className="w-[70px]">
                 <label className="text-[10px] text-[#556077] font-semibold mb-1 block">GST</label>
                 <div className="relative">
                   <select className="w-full border border-gray-200 rounded-[8px] px-2 py-2 text-[13px] outline-none appearance-none bg-transparent" value={newItem.gst} onChange={e => setNewItem({...newItem, gst: parseInt(e.target.value)})}>
                     <option value={0}>0%</option>
                     <option value={5}>5%</option>
                     <option value={12}>12%</option>
                     <option value={18}>18%</option>
                     <option value={28}>28%</option>
                   </select>
                   <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                 </div>
               </div>

               <div className="mt-4">
                 <button onClick={handleAddItem} className="w-[42px] h-[42px] rounded-[10px] bg-[#5B5CEB] text-white flex items-center justify-center shadow-md active:scale-95 transition-all">
                   <Plus size={20} />
                 </button>
               </div>
             </div>
          </div>
        </div>

        {/* Existing Items */}
        <div className="bg-white rounded-[16px] shadow-[0_6px_20px_rgba(15,20,36,0.06)] border border-gray-50 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-50">
            <h3 className="text-[13px] font-bold text-[#5B5CEB] tracking-wide uppercase">Items Added</h3>
            <span className="text-[13px] text-[#556077] font-medium">{items.length} Items</span>
          </div>

          {items.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-center opacity-70">
              <FileText size={48} className="text-gray-300 mb-3" />
              <p className="font-semibold text-[#0F1724]">No items added yet</p>
              <p className="text-[13px] text-[#556077]">Add items to generate invoice</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.id} className="p-4 flex gap-3 group relative overflow-hidden bg-white hover:bg-gray-50 transition-colors items-center">
                   <div className="w-[48px] h-[48px] rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center text-gray-400">
                     <Package size={24} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="text-[15px] font-semibold text-[#0F1724] truncate">{item.name}</h4>
                     <div className="flex items-center gap-2 mt-1">
                       <span className="text-[11px] bg-gray-100 text-[#556077] px-2 py-0.5 rounded font-medium">HSN: {item.hsn}</span>
                       <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium flex items-center gap-0.5">GST {item.gst}%</span>
                     </div>
                   </div>
                   <div className="text-right flex flex-col items-end justify-center">
                     <span className="text-[16px] font-bold text-[#0F1724]">₹{item.amount.toFixed(2)}</span>
                     <span className="text-[11px] text-[#556077] mt-0.5">{item.qty} × ₹{item.rate.toFixed(1)}</span>
                   </div>
                   
                   <button onClick={() => deleteItem(item.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0 ml-1">
                     <Trash2 size={14} />
                   </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pt-6">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white to-transparent pointer-events-none"></div>
        {/* Bill Total Summaries Card */}
        <div className="relative mx-4 mb-2 bg-white rounded-[16px] shadow-[0_-4px_20px_rgba(15,20,36,0.08)] p-4 flex items-center justify-between border border-gray-100">
          <div className="flex gap-4">
             <div>
               <p className="text-[12px] text-[#556077] font-medium">Subtotal</p>
               <p className="text-[16px] font-bold text-[#0F1724]">₹{subtotal.toFixed(2)}</p>
             </div>
             <div className="w-[1px] bg-gray-100 h-8 self-center"></div>
             <div>
               <p className="text-[12px] text-[#556077] font-medium">GST</p>
               <p className="text-[16px] font-bold text-[#0F1724]">₹{totalGst.toFixed(2)}</p>
             </div>
          </div>
          <div className="bg-[#E6FBF2] px-4 py-2 rounded-[12px]">
             <p className="text-[12px] text-[#17B890] font-bold mb-0.5">Total</p>
             <p className="text-[20px] font-black text-[#17B890] leading-none">₹{total.toFixed(2)}</p>
          </div>
        </div>

        {/* Generate / Action CTAs */}
        <div className="relative bg-white px-4 py-3 border-t border-gray-100 flex gap-3 items-center pb-6">
          <button onClick={() => showToast("Draft saved directly to your phone!")} className="flex-1 py-3.5 rounded-[14px] border-2 border-[#5B5CEB] text-[#5B5CEB] font-bold text-[15px] flex justify-center items-center gap-2 active:scale-95 transition-transform bg-white">
             <FileText size={18} strokeWidth={2.5}/> Save Draft
          </button>
          <button onClick={handleGenerate} disabled={isGenerating || items.length === 0} className="flex-[1.5] py-3.5 rounded-[14px] bg-gradient-to-r from-[#6B46FF] to-[#5B5CEB] text-white font-bold text-[15px] flex justify-center items-center gap-2 shadow-[0_4px_16px_rgba(91,92,235,0.3)] active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100">
             {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} strokeWidth={2.5}/>} 
             {isGenerating ? "Generating..." : "Generate Bill"}
          </button>
        </div>
      </div>

      {/* GENERATED BILL SUCCESS OVERLAY */}
      {showSuccessCard && (
         <div className="absolute inset-0 bg-white z-[80] flex flex-col p-6 animate-in slide-in-from-bottom flex-1 h-full overflow-y-auto w-full">
            <div className="pt-4 pb-2 flex justify-end w-full">
                <button onClick={() => setShowSuccessCard(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100"><X size={24}/></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">
                <div className="w-24 h-24 bg-[#E6FBF2] text-[#17B890] rounded-full flex items-center justify-center mb-6 animate-in zoom-in spin-in-12 duration-500 shadow-sm border-[4px] border-white">
                    <CheckCircle2 size={50} strokeWidth={2.5} />
                </div>
                <h2 className="text-[26px] font-bold text-[#0F1724] mb-2 text-center">Bill Generated!</h2>
                <p className="text-[#556077] mb-8 text-[15px]">Invoice #{invoiceNumber} created successfully</p>
                
                <div className="w-full bg-[#F6F7FB] p-6 rounded-[20px] border border-gray-100 mb-8 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                        <span className="text-[#556077] font-medium">Total Amount</span>
                        <span className="font-black text-[30px] text-[#5B5CEB]">₹{total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[14px] mb-2.5">
                        <span className="text-[#556077]">Customer</span>
                        <span className="font-bold text-[#0F1724]">{customerType}</span>
                    </div>
                    <div className="flex justify-between text-[14px] mb-2.5">
                        <span className="text-[#556077]">Items Included</span>
                        <span className="font-bold text-[#0F1724]">{items.length} Products</span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                        <span className="text-[#556077]">Payment Status</span>
                        <span className="font-bold text-[#17B890] flex items-center gap-1"><CheckCircle2 size={14}/> {paymentMode}</span>
                    </div>
                </div>

                <div className="w-full space-y-3.5 mt-auto">
                    <button onClick={handleShareWhatsapp} className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-[16px] font-bold text-[16px] shadow-[0_4px_14px_rgba(37,211,102,0.3)] active:scale-95 transition-transform">
                       <MessageSquare size={22} fill="currentColor" /> Share on WhatsApp
                    </button>
                    <div className="flex gap-3">
                        <button onClick={handleNativeShare} className="flex-1 flex items-center justify-center gap-2 bg-[#5B5CEB] text-white py-4 rounded-[16px] font-bold text-[15px] shadow-[0_4px_14px_rgba(91,92,235,0.3)] active:scale-95 transition-transform">
                           <Share2 size={20} /> Share
                        </button>
                        <button onClick={() => showToast("Downloading standard PDF receipt...")} className="flex-1 flex items-center justify-center gap-2 bg-[#F6F7FB] text-[#0F1724] border border-gray-200 py-4 rounded-[16px] font-bold text-[15px] active:scale-95 transition-transform">
                           <Download size={20} /> Get PDF
                        </button>
                    </div>
                    <button onClick={() => { setShowSuccessCard(false); setItems([]); showToast("Ready for New Bill"); }} className="w-full py-4 mt-2 rounded-[16px] text-[#556077] font-bold hover:bg-gray-100 transition-colors active:bg-gray-200">
                        Create New Bill
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* Select Payment Modal Options Layer */}
      {showPaymentModal && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-end justify-center animate-in fade-in" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white w-full rounded-t-[24px] p-6 pb-8 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[18px] font-bold">Select Payment Mode</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
               {["Cash", "UPI / QR Code", "Credit Card", "Store Credit", "Bank Transfer"].map(mode => (
                  <button key={mode} onClick={() => { setPaymentMode(mode); setShowPaymentModal(false); showToast(`Payment set to ${mode}`); }} className={`p-4 rounded-xl border-2 text-center transition-all ${paymentMode === mode ? "border-[#5B5CEB] bg-[#F0EEFF] text-[#5B5CEB] font-bold shadow-sm" : "border-gray-100 text-gray-700 hover:bg-gray-50 bg-white"}`}>
                     {mode}
                  </button>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Select Customer Mode Options Layer */}
      {showCustomerModal && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-end justify-center animate-in fade-in" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white w-full rounded-t-[24px] p-6 pb-8 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[18px] font-bold">Select Bill Type</h3>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>
            <div className="flex flex-col gap-3 mb-2">
               {["Walk-in Customer", "Regular Customer", "B2B / Wholesale", "Exempt Customer"].map(type => (
                  <button key={type} onClick={() => { setCustomerType(type); setShowCustomerModal(false); showToast(`Customer set to ${type}`); }} className={`p-4.5 rounded-xl border-2 text-left transition-all ${customerType === type ? "border-[#17B890] bg-[#E6FBF2] text-[#17B890] font-bold shadow-sm" : "border-gray-100 text-gray-700 hover:bg-gray-50 bg-white"}`}>
                     {type}
                  </button>
               ))}
            </div>
          </div>
        </div>
      )}

      
      
    </div>
  );
};
export default InvoicePro;
