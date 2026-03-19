import React, { useState, useEffect } from 'react';
import { FileText, FileCheck, MessageCircle, Download, Trash2, Plus, Search, X, ArrowLeft } from 'lucide-react';
import VoiceInput from '../VoiceInput';
import { QuotationSchema } from '../../schemas';

interface QuotationMakerProps {
    onUpdateData?: (data: any) => void;
    onBack?: () => void;
    t: (key: string) => string;
    shopDetails: any;
    data: any;
    isDark: boolean;
}

const QuotationMaker: React.FC<QuotationMakerProps> = ({ t, shopDetails, data, isDark, onBack }) => {
    // State
    const [quoteCust, setQuoteCust] = useState({ name: '', phone: '', address: '' });
    const [quoteItems, setQuoteItems] = useState<any[]>([]);
    const [quoteDiscount, setQuoteDiscount] = useState(0);
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [quoteSettings, setQuoteSettings] = useState({ terms: '1. Goods once sold will not be taken back.\n2. Warranty as per manufacturer policy.', shopAddress: '' });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // UI State
    const [showItemSelector, setShowItemSelector] = useState(false);
    const [quoteSearch, setQuoteSearch] = useState('');

    // Shared Styles
    const commonInputClass = `w-full ${isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} border rounded-xl p-3.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`;

    // Load Draft
    useEffect(() => {
        const saved = localStorage.getItem('quote_draft');
        if (saved) {
            try {
                const parse = JSON.parse(saved);
                setQuoteCust(parse.cust || { name: '', phone: '', address: '' });
                setQuoteItems(parse.items || []);
                setQuoteDiscount(parse.discount || 0);
                if (parse.settings) setQuoteSettings(prev => ({ ...prev, ...parse.settings }));
            } catch (e) {
                console.error("Failed to load draft");
            }
        }
    }, []);

    // Save Draft
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (quoteItems.length > 0 || quoteCust.name) {
                localStorage.setItem('quote_draft', JSON.stringify({
                    cust: quoteCust,
                    items: quoteItems,
                    discount: quoteDiscount,
                    settings: quoteSettings
                }));
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [quoteCust, quoteItems, quoteDiscount, quoteSettings]);

    const quoteSubtotal = quoteItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const quoteTotal = quoteSubtotal - quoteDiscount;

    const generatePdfHtml = () => {
        return `
            <html>
                <head>
                    <title>Quotation - ${quoteCust.name}</title>
                    <style>
                        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                        .shop-name { font-size: 28px; font-weight: 900; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                        .shop-tagline { font-size: 14px; color: #64748b; margin-top: 5px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .box { background: #f8fafc; padding: 15px; border-radius: 8px; width: 45%; }
                        .box-title { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px; }
                        .box-value { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px #e2e8f0; }
                        th, td { padding: 12px 15px; text-align: left; }
                        th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 13px; text-transform: uppercase; }
                        td { border-top: 1px solid #e2e8f0; font-size: 14px; }
                        .totals-container { display: flex; justify-content: flex-end; }
                        .totals { background: #f8fafc; padding: 20px; border-radius: 8px; width: 300px; }
                        .tot-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                        .tot-final { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px dashed #cbd5e1; font-size: 20px; font-weight: 800; color: #2563eb; }
                        .terms { margin-top: 50px; font-size: 12px; color: #64748b; }
                        .terms-title { font-weight: 700; color: #475569; margin-bottom: 5px; }
                        .footer { margin-top: 50px; text-align: right; }
                        .sign-line { width: 150px; border-bottom: 1px solid #cbd5e1; display: inline-block; margin-bottom: 5px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 class="shop-name">${shopDetails.name || 'AUTO PARTS STORE'}</h1>
                        <div class="shop-tagline">${quoteSettings.shopAddress || shopDetails.address || 'Your Trusted Auto Parts Partner'}</div>
                    </div>
                    
                    <div style="text-align: center; font-size: 24px; font-weight: 800; margin-bottom: 30px; letter-spacing: 2px;">ESTIMATE / QUOTATION</div>
                    
                    <div class="row">
                        <div class="box">
                            <div class="box-title">Quotation To</div>
                            <h3 class="box-value">${quoteCust.name || 'Cash Customer'}</h3>
                            <div style="font-size: 14px; color: #475569; margin-top: 5px;">${quoteCust.phone}</div>
                            ${quoteCust.address ? `<div style="font-size: 14px; color: #475569; margin-top: 2px;">${quoteCust.address}</div>` : ''}
                        </div>
                        <div class="box" style="text-align: right;">
                            <div class="box-title">Quotation details</div>
                            <div style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date(quoteDate).toLocaleDateString('en-IN')}</div>
                            <div><strong>Valid Until:</strong> ${new Date(new Date(quoteDate).getTime() + (7 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-IN')}</div>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item Description</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Rate (₹)</th>
                                <th style="text-align: right;">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${quoteItems.map((item, i) => `
                                <tr>
                                    <td style="color: #64748b;">${i + 1}</td>
                                    <td style="font-weight: 500;">
                                        ${item.name}
                                        ${item.brand ? `<br><span style="font-size: 11px; color: #64748b;">Brand: ${item.brand}</span>` : ''}
                                    </td>
                                    <td style="text-align: center;">${item.quantity}</td>
                                    <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                    <td style="text-align: right; font-weight: 600;">${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="totals-container">
                        <div class="totals">
                            <div class="tot-row">
                                <span>Subtotal</span>
                                <strong>₹${quoteSubtotal.toFixed(2)}</strong>
                            </div>
                            <div class="tot-row" style="color: #ef4444;">
                                <span>Discount</span>
                                <strong>- ₹${quoteDiscount.toFixed(2)}</strong>
                            </div>
                            <div class="tot-final">
                                <span>Total Amount</span>
                                <span>₹${quoteTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="terms">
                        <div class="terms-title">Terms & Conditions</div>
                        ${quoteSettings.terms.split('\n').map(t => `<div style="margin-bottom: 4px;">${t}</div>`).join('')}
                    </div>

                    <div class="footer">
                        <div class="sign-line"></div>
                        <div style="font-size: 12px; color: #64748b; font-weight: bold;">Authorized Signatory</div>
                    </div>
                </body>
            </html>
        `;
    };

    const handleWhatsAppShare = () => {
        let msg = `*Quotation from ${shopDetails.name}*\nDate: ${new Date(quoteDate).toLocaleDateString('en-IN')}\n\n`;
        msg += `*Customer:* ${quoteCust.name || 'Sir/Madam'}\n\n`;
        msg += `*Items:*\n`;
        quoteItems.forEach((item, i) => {
            msg += `${i + 1}. ${item.name} x ${item.quantity} - ₹${item.price * item.quantity}\n`;
        });
        msg += `\n*Subtotal:* ₹${quoteSubtotal}`;
        if (quoteDiscount > 0) msg += `\n*Discount:* ₹${quoteDiscount}`;
        msg += `\n*Total Estimate:* ₹${quoteTotal}\n\n`;
        msg += `Thank you for your inquiry!`;

        const encodedMsg = encodeURIComponent(msg);
        let url = quoteCust.phone && quoteCust.phone.length >= 10
            ? `https://wa.me/91${quoteCust.phone.replace(/\D/g, '').slice(-10)}?text=${encodedMsg}`
            : `https://wa.me/?text=${encodedMsg}`;
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(generatePdfHtml());
            win.document.close();
            setTimeout(() => {
                win.print();
            }, 500);
        }
    };

    const clearQuotation = () => {
        if (window.confirm("Clear all items and start fresh?")) {
            setQuoteItems([]);
            setQuoteCust({ name: '', phone: '', address: '' });
            setQuoteDiscount(0);
            localStorage.removeItem('quote_draft');
        }
    };

    return (
        <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                            <ArrowLeft size={22} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
                        </button>
                    )}
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="text-blue-500" size={24} />
                        Quotation Maker
                    </h2>
                </div>
                <div className="flex gap-2">
                     <button onClick={clearQuotation} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors" title="Clear All">
                         <Trash2 size={20} />
                     </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Customer Details */}
                <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Customer Details</h4>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                placeholder="Customer Name"
                                className={commonInputClass}
                                value={quoteCust.name}
                                onChange={e => setQuoteCust({ ...quoteCust, name: e.target.value })}
                            />
                            <input
                                placeholder="Phone Number"
                                type="tel"
                                className={commonInputClass}
                                value={quoteCust.phone}
                                onChange={e => setQuoteCust({ ...quoteCust, phone: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="date"
                                className={commonInputClass}
                                value={quoteDate}
                                onChange={e => setQuoteDate(e.target.value)}
                            />
                            <input
                                placeholder="Locality / Address"
                                className={commonInputClass}
                                value={quoteCust.address}
                                onChange={e => setQuoteCust({ ...quoteCust, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Items ({quoteItems.length})</h4>
                        <button
                            onClick={() => setShowItemSelector(true)}
                            className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-200 transition-colors"
                        >
                            <Plus size={16} /> Add Item
                        </button>
                    </div>

                    <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 pb-2 border-b dark:border-slate-700 mb-2">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Rate</div>
                        <div className="col-span-2 text-right">Amount</div>
                        <div className="col-span-1"></div>
                    </div>

                    {quoteItems.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-gray-400 text-sm font-medium">No items added to estimate.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {quoteItems.map((item, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'} md:border-none md:bg-transparent md:p-0 md:flex md:items-center`}>
                                    <div className="flex justify-between md:hidden mb-2">
                                        <span className="font-bold">{item.name}</span>
                                        <button onClick={() => {
                                            const newItems = [...quoteItems];
                                            newItems.splice(idx, 1);
                                            setQuoteItems(newItems);
                                        }} className="text-red-400 p-1"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-12 md:col-span-5 hidden md:block font-medium truncate" title={item.name}>{item.name}</div>
                                        <div className="col-span-4 md:col-span-2 text-center">
                                            <input
                                                type="number"
                                                min="1"
                                                className={`w-full text-center p-2 rounded-lg border outline-none font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'} focus:border-blue-500`}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const newItems = [...quoteItems];
                                                    newItems[idx].quantity = val;
                                                    setQuoteItems(newItems);
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <input
                                                type="number"
                                                className={`w-full text-right p-2 rounded-lg border outline-none font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'} focus:border-blue-500`}
                                                value={item.price}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const newItems = [...quoteItems];
                                                    newItems[idx].price = val;
                                                    setQuoteItems(newItems);
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-2 text-right font-black pt-2 md:pt-0">
                                            ₹{(item.price * item.quantity).toFixed(2)}
                                        </div>
                                        <div className="hidden md:block col-span-1 text-right">
                                            <button onClick={() => {
                                                const newItems = [...quoteItems];
                                                newItems.splice(idx, 1);
                                                setQuoteItems(newItems);
                                            }} className="text-red-400 hover:text-red-500 p-1"><X size={18}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals */}
                <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    <div className="space-y-3 pb-4 border-b border-dashed dark:border-slate-700">
                        <div className="flex justify-between items-center">
                            <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Subtotal</span>
                            <span className="font-bold text-lg">₹{quoteSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                            <span className="font-medium">Discount (₹)</span>
                            <input
                                type="number"
                                className={`w-28 p-2 rounded-lg border text-right font-bold outline-none ${isDark ? 'bg-slate-900 border-red-500/30' : 'bg-red-50/50 border-red-200'} focus:border-red-500`}
                                value={quoteDiscount || ''}
                                placeholder="0"
                                onChange={e => setQuoteDiscount(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                        <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total Estimate</span>
                        <span className="text-3xl font-black text-blue-500">₹{quoteTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className={`p-4 border-t shrink-0 grid grid-cols-2 gap-3 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                <button
                    onClick={handlePrint}
                    className="py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all focus:scale-95"
                >
                    <Download size={20} /> Print / PDF
                </button>
                <button
                    onClick={handleWhatsAppShare}
                    className="py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-[#25D366] text-white hover:brightness-105 shadow-lg shadow-[#25D366]/30 transition-all focus:scale-95"
                >
                    <MessageCircle size={20} /> Send on WA
                </button>
            </div>

            {/* Item Selector Modal */}
            {showItemSelector && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex flex-col justify-end sm:justify-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full sm:max-w-md h-[70vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95`}>
                        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg">Add Items to Estimate</h3>
                            <button onClick={() => setShowItemSelector(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X size={20} /></button>
                        </div>
                        <div className="p-4 shrink-0">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        className={commonInputClass.replace('p-3.5', 'p-3 pl-10')}
                                        placeholder="Search inventory..."
                                        value={quoteSearch}
                                        onChange={e => setQuoteSearch(e.target.value)}
                                        autoFocus
                                    />
                <div className="absolute right-12 top-1.5 z-10"><VoiceInput onResult={setQuoteSearch} isDark={isDark} /></div>
                                </div>
                                <div className="shrink-0 flex items-center justify-center">
                                    <VoiceInput onResult={setQuoteSearch} isDark={isDark} />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {data?.pages?.filter((item: any) =>
                                (item.itemName || "").toLowerCase().includes(quoteSearch.toLowerCase()) ||
                                (item.barcode && item.barcode.some((b: string) => b.includes(quoteSearch)))
                            ).map((item: any) => (
                                <div
                                    key={item.id}
                                    className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-200 hover:bg-blue-50 hover:border-blue-200'}`}
                                    onClick={() => {
                                        setQuoteItems([...quoteItems, {
                                            id: item.id,
                                            name: item.itemName,
                                            price: item.purchases && item.purchases.length > 0 ? item.purchases[0].price : 0,
                                            quantity: 1,
                                            brand: item.brand
                                        }]);
                                        setShowItemSelector(false);
                                        setQuoteSearch('');
                                    }}
                                >
                                    <div>
                                        <p className="font-bold">{item.itemName}</p>
                                        <p className="text-xs text-gray-500">Inventory item</p>
                                    </div>
                                    <p className="font-black text-blue-500">?{item.purchases && item.purchases.length > 0 ? item.purchases[0].price : 0}</p>
                                </div>
                            ))}
                            {/* Manual Entry Fallback */}
                            {quoteSearch && !data?.pages?.find((item: any) => (item.itemName || "").toLowerCase() === quoteSearch.toLowerCase()) && (
                                <div
                                    className={`p-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 text-center cursor-pointer`}
                                    onClick={() => {
                                        setQuoteItems([...quoteItems, {
                                            id: 'manual_' + Date.now(),
                                            name: quoteSearch,
                                            price: 0,
                                            quantity: 1
                                        }]);
                                        setShowItemSelector(false);
                                        setQuoteSearch('');
                                    }}
                                >
                                    <Plus className="mx-auto mb-1 text-blue-500" size={24} />
                                    <p className="font-bold text-blue-600 dark:text-blue-400">Add "{quoteSearch}" as custom item</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotationMaker;
