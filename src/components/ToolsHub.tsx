import InvoicePro from './tools/InvoicePro';
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calculator, FileText, Percent, DollarSign, RefreshCcw, Activity, Pin, StickyNote, CreditCard, Languages, Share2, Plus, Trash2, Copy, BarChart2, Shield, UploadCloud } from 'lucide-react';
import { FloatingNoteMenu } from './FloatingNoteMenu';
import VoiceInput from './VoiceInput';
import DOMPurify from 'dompurify';

// Imported Tools
import GstCalculator from './tools/GstCalculator';
import EmiCalculator from './tools/EmiCalculator';
import MarginCalculator from './tools/MarginCalculator';
import UnitConverter from './tools/UnitConverter';
import StockValueCalculator from './tools/StockValueCalculator';
import DigitalBusinessCard from './tools/DigitalBusinessCard';
import NoteMaster from './tools/NoteMaster';
import QuotationMaker from './tools/QuotationMaker';
import { SupplierLedger } from './tools/SupplierLedger';
import { CustomerUdhaar } from './tools/CustomerUdhaar';
import { AnalyticsDashboard } from './tools/AnalyticsDashboard';
import { WarrantyTracking } from './tools/WarrantyTracking';
import { DataImportExport } from './tools/DataImportExport';

// Assuming basic translate helper is available, or passed as prop. 
// The original code used `translateWithGoogle` global or imported? 
// It seemed to be defined in App.tsx or similar and passed down?
// Oh, `translateWithGoogle` was used in `handleTranslate` which was inside ToolsHub.
// I need to check where `translateWithGoogle` comes from. 
// It was interacting with `ToolsHub` state.
// Wait, I saw `let result = await translateWithGoogle(...)` in line 202.
// It seems `translateWithGoogle` is imported or global. I will assume it's available or imported.
// If it was not imported in the file view, it might be a global function or I missed an import.
// Let's assume I need to keep it working.

// Since I am keeping Translator inline, I need `translateWithGoogle`.
// I'll add a dummy placeholder or try to find where it is.
// Actually, looking at previous logs, `ToolsHub.tsx` didn't show imports.
// I'll assume it's imported.

// Mock for translateWithGoogle if not found, but I should try to import it if I can finding it.
// I'll check imports later if it fails. For now, I'll assume it is in scope or imported.

import { AppData, ShopDetails } from '../types';

interface ToolsHubProps {
    onBack: () => void;
    t: (key: string) => string;
    isDark: boolean;
    initialTool?: string | null;
    initialNoteId?: string | number | null;
    pinnedTools?: string[];
    onTogglePin?: (toolId: string) => void;
    shopDetails: ShopDetails;
    data: AppData;
}

const ToolsHub: React.FC<ToolsHubProps> = ({ onBack, t, isDark, initialTool = null, initialNoteId = null, pinnedTools, onTogglePin, shopDetails, data }) => {
    const [activeTool, setActiveTool] = useState<string | null>(initialTool);
    const openedDirectlyRef = useRef(!!initialTool);

    // Initial tool effect
    useEffect(() => {
        if (initialTool) {
            setActiveTool(initialTool);
            openedDirectlyRef.current = true;
        } else {
            setActiveTool(null);
            openedDirectlyRef.current = false;
        }
    }, [initialTool]);

    const handleBackFromTool = () => {
        if (!activeTool || openedDirectlyRef.current) {
            onBack();
            openedDirectlyRef.current = false;
        } else {
            setActiveTool(null);
        }
    };

    // ?? BUSINESS CALCULATOR STATE
    const [calcExpression, setCalcExpression] = useState('');
    const [calcResult, setCalcResult] = useState('0');
    const [calcHistory, setCalcHistory] = useState<string[]>([]);

    // Calculate Effect
    useEffect(() => {
        try {
            // Safety check for safe eval
            if (/^[0-9+\-*/.() ]+$/.test(calcExpression)) {
                // eslint-disable-next-line no-eval
                const result = eval(calcExpression);
                if (isFinite(result) && !isNaN(result)) {
                    const formatted = Number(result.toFixed(6)).toString();
                    setCalcResult(formatted);
                }
            }
        } catch (e) {
            // Ignore incomplete expressions
        }
    }, [calcExpression, activeTool]);


    // ?? INVOICE GENERATOR STATE
    const [invoiceNumber] = useState(Date.now().toString().slice(-6)); // Simple random ID
    const [invItems, setInvItems] = useState<any[]>([]);
    const [invCust, setInvCust] = useState({ name: '', phone: '', gstNo: '' });
    const [invSettings, setInvSettings] = useState({ showGst: true, discount: 0, discountType: 'flat', paymentMode: 'cash', invoiceType: 'retail', notes: '' });
    const [invCurrentItem, setInvCurrentItem] = useState({ name: '', qty: 1, rate: 0, gst: 18, unit: 'pcs', hsn: '' });



    const tools = [
        { id: 'basicCalc', name: 'Business Calc', icon: <Calculator size={24} />, color: 'bg-teal-100 text-teal-600', desc: 'Quick Calculator' },
        { id: 'quotation', name: 'Quotation', icon: <FileText size={24} />, color: 'bg-indigo-100 text-indigo-600', desc: 'Make Estimates' },
        { id: 'invoice', name: 'Bill Generator', icon: <FileText size={24} />, color: 'bg-blue-100 text-blue-600', desc: 'GST & Retail Bills' },
        { id: 'gst', name: 'GST Pro', icon: <Percent size={24} />, color: 'bg-blue-100 text-blue-600', desc: 'Calculate GST' },
        { id: 'margin', name: 'Profit Analyzer', icon: <Calculator size={24} />, color: 'bg-purple-100 text-purple-600', desc: 'Margin & Markup' },
        { id: 'emi', name: 'EMI Calculator', icon: <DollarSign size={24} />, color: 'bg-emerald-100 text-emerald-600', desc: 'Loan EMI Calc' },
        { id: 'converter', name: 'Unit Convert', icon: <RefreshCcw size={24} />, color: 'bg-green-100 text-green-600', desc: 'KG, Tons, Feet' },
        { id: 'stockvalue', name: 'Stock Value', icon: <Activity size={24} />, color: 'bg-cyan-100 text-cyan-600', desc: 'Inventory Worth' },
        { id: 'card', name: 'Digital Card', icon: <CreditCard size={24} />, color: 'bg-orange-100 text-orange-600', desc: 'Business Card' },
        { id: 'notes', name: 'Note Master', icon: <StickyNote size={24} />, color: 'bg-yellow-100 text-yellow-600', desc: 'Smart Notes' },
        { id: 'supplier', name: 'Suppliers', icon: <DollarSign size={24} />, color: 'bg-red-100 text-red-600', desc: 'Vendor Ledgers' },
        { id: 'udhaar', name: 'Udhaar', icon: <CreditCard size={24} />, color: 'bg-green-100 text-green-600', desc: 'Customer Credit' },
        { id: 'analytics', name: 'Analytics', icon: <BarChart2 size={24} />, color: 'bg-indigo-100 text-indigo-600', desc: 'Sales & Trends' },
        { id: 'warranty', name: 'Warranties', icon: <Shield size={24} />, color: 'bg-emerald-100 text-emerald-600', desc: 'Track Expirations' },
        { id: 'import', name: 'Data Import', icon: <UploadCloud size={24} />, color: 'bg-blue-100 text-blue-600', desc: 'Migrate CSV/Excel' },
    ];

// Invoice Logic
    const addInvItem = () => {
        if (!invCurrentItem.name || !invCurrentItem.rate) return;
        const baseTotal = invCurrentItem.qty * invCurrentItem.rate;
        const gstAmt = invSettings.showGst ? (baseTotal * invCurrentItem.gst) / 100 : 0;
        const newItem = {
            ...invCurrentItem,
            id: Date.now(),
            baseTotal,
            gstAmt,
            total: baseTotal + gstAmt
        };
        setInvItems([...invItems, newItem]);
        setInvCurrentItem({ name: '', qty: 1, rate: 0, gst: 18, unit: 'pcs', hsn: '' });
    };

    const deleteInvItem = (id: any) => setInvItems(invItems.filter(i => i.id !== id));

    const calculateBillTotals = () => {
        const subtotal = invItems.reduce((acc, curr) => acc + curr.baseTotal, 0);
        const totalGst = invItems.reduce((acc, curr) => acc + curr.gstAmt, 0);
        const discountAmt = invSettings.discountType === 'percent'
            ? (subtotal * invSettings.discount / 100)
            : invSettings.discount;
        const grandTotal = subtotal + totalGst - discountAmt;
        return { subtotal, totalGst, discountAmt, grandTotal };
    };

    const shareInvoiceImage = async () => {
        try {
            alert("Share functionality requires device capabilities.");
        } catch (e) { console.error(e); }
    };

    const renderToolContent = () => {
        const commonInputClass = `w-full p-3 rounded-xl border font-bold text-lg mb-4 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
        const cardClass = `h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`;
        const totals = calculateBillTotals();

        switch (activeTool) {
            case 'gst': return <GstCalculator t={t} isDark={isDark} onBack={handleBackFromTool} />;
            case 'margin': return <MarginCalculator isDark={isDark} onBack={handleBackFromTool} t={t} />;
            case 'emi': return <EmiCalculator isDark={isDark} onBack={handleBackFromTool} />;
            case 'converter': return <UnitConverter isDark={isDark} onBack={handleBackFromTool} t={t} />;
            case 'stockvalue': return <StockValueCalculator t={t} isDark={isDark} onBack={handleBackFromTool} />;
            case 'card': return <DigitalBusinessCard shopDetails={shopDetails} t={t} isDark={isDark} onBack={handleBackFromTool} />;
            case 'notes': return <NoteMaster t={t} isDark={isDark} initialNoteId={initialNoteId} onBack={handleBackFromTool} />;
            case 'quotation': return <QuotationMaker t={t} shopDetails={shopDetails} data={data} isDark={isDark} onBack={handleBackFromTool} />;
            case 'supplier': return <SupplierLedger isDark={isDark} t={t} onBack={handleBackFromTool} />;
            case 'udhaar': return <CustomerUdhaar isDark={isDark} t={t} onBack={handleBackFromTool} />;
            case 'analytics': return <AnalyticsDashboard isDark={isDark} t={t} onBack={handleBackFromTool} />;
            case 'warranty': return <WarrantyTracking isDark={isDark} t={t} onBack={handleBackFromTool} />;
            case 'import': return <DataImportExport isDark={isDark} t={t} onBack={handleBackFromTool} />;

            case 'basicCalc': {
                const handleCalcInput = (value: string) => {
                    setCalcExpression(prev => prev + value);
                };

                const handleOperator = (op: string) => {
                    if (calcExpression === '' && op !== '-') return;
                    const lastChar = calcExpression.slice(-1);
                    if (['+', '-', '*', '/', '.'].includes(lastChar)) {
                        setCalcExpression(prev => prev.slice(0, -1) + op);
                    } else {
                        setCalcExpression(prev => prev + op);
                    }
                };

                const finalizeResult = () => {
                    if (calcResult !== 'Error' && calcResult !== '0') {
                        const historyEntry = `${calcExpression} = ${calcResult}`;
                        setCalcHistory(prev => [historyEntry, ...prev.slice(0, 9)]);
                        setCalcExpression(calcResult);
                    }
                };

                const clearCalc = () => {
                    setCalcExpression('');
                    setCalcResult('0');
                };

                const backspace = () => {
                    setCalcExpression(prev => prev.slice(0, -1));
                };

                const buttons = [
                    { label: 'C', action: clearCalc, color: 'bg-red-500 text-white shadow-red-500/30' },
                    { label: '(', action: () => handleCalcInput('('), color: 'bg-gray-200 dark:bg-slate-700 dark:text-gray-300' },
                    { label: ')', action: () => handleCalcInput(')'), color: 'bg-gray-200 dark:bg-slate-700 dark:text-gray-300' },
                    { label: '÷', action: () => handleOperator('/'), color: 'bg-indigo-500 text-white shadow-indigo-500/30' },
                    { label: '7', action: () => handleCalcInput('7'), color: 'bg-white dark:bg-slate-800' },
                    { label: '8', action: () => handleCalcInput('8'), color: 'bg-white dark:bg-slate-800' },
                    { label: '9', action: () => handleCalcInput('9'), color: 'bg-white dark:bg-slate-800' },
                    { label: '×', action: () => handleOperator('*'), color: 'bg-indigo-500 text-white shadow-indigo-500/30' },
                    { label: '4', action: () => handleCalcInput('4'), color: 'bg-white dark:bg-slate-800' },
                    { label: '5', action: () => handleCalcInput('5'), color: 'bg-white dark:bg-slate-800' },
                    { label: '6', action: () => handleCalcInput('6'), color: 'bg-white dark:bg-slate-800' },
                    { label: '-', action: () => handleOperator('-'), color: 'bg-indigo-500 text-white shadow-indigo-500/30' },
                    { label: '1', action: () => handleCalcInput('1'), color: 'bg-white dark:bg-slate-800' },
                    { label: '2', action: () => handleCalcInput('2'), color: 'bg-white dark:bg-slate-800' },
                    { label: '3', action: () => handleCalcInput('3'), color: 'bg-white dark:bg-slate-800' },
                    { label: '+', action: () => handleOperator('+'), color: 'bg-indigo-500 text-white shadow-indigo-500/30' },
                    { label: '0', action: () => handleCalcInput('0'), color: 'bg-white dark:bg-slate-800 col-span-1' },
                    { label: '.', action: () => handleCalcInput('.'), color: 'bg-white dark:bg-slate-800' },
                    { label: '⌫', action: backspace, color: 'bg-orange-500 text-white shadow-orange-500/30' },
                    { label: '=', action: finalizeResult, color: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-emerald-500/30' },
                ];

                return (
                    <div className={cardClass}>
                          <div className="flex items-center gap-3 mb-6 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                              <button onClick={handleBackFromTool} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                                  <ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />
                              </button>
                              <h3 className="font-bold text-2xl flex items-center gap-2">
                                  <Calculator className="text-indigo-500" size={24} />
                                  Calculator
                              </h3>
                          </div>

                        {/* Display Area */}
                        <div className={`p-6 rounded-3xl mb-6 shadow-inner flex flex-col items-end justify-end h-32 transition-colors ${isDark ? 'bg-black/40' : 'bg-gray-100'}`}>
                            {/* Expression (Small) */}
                            <div className={`text-right w-full mb-1 text-lg font-medium tracking-wide overflow-x-auto whitespace-nowrap hide-scrollbar opacity-60 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {calcExpression || '0'}
                            </div>

                            {/* Result (Big) */}
                            <div className={`text-right w-full text-5xl font-black tracking-tight overflow-x-auto whitespace-nowrap hide-scrollbar ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {calcResult}
                            </div>
                        </div>

                        {/* Keypad */}
                        <div className="grid grid-cols-4 gap-3 flex-1">
                            {buttons.map((btn, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        const target = e.currentTarget;
                                        target.classList.add('scale-90');
                                        setTimeout(() => target.classList.remove('scale-90'), 100);
                                        btn.action();
                                    }}
                                    className={`
                                        relative overflow-hidden
                                        h-16 rounded-2xl font-bold text-xl transition-all duration-100 ease-out
                                        flex items-center justify-center
                                        active:scale-95 hover:brightness-110 shadow-sm
                                        ${btn.color}
                                        ${isDark && btn.color.includes('bg-white') ? '!bg-slate-800 !text-white !shadow-slate-900/50' : ''}
                                    `}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        {/* History */}
                        {calcHistory.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
                                <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-50">History</p>
                                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                    {calcHistory.slice(0, 5).map((entry, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                const parts = entry.split(' = ');
                                                if (parts[1]) {
                                                    setCalcExpression(parts[1]);
                                                    setCalcResult(parts[1]);
                                                }
                                            }}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {entry}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
            case 'invoice':
                return <InvoicePro onBack={handleBackFromTool} shopName={shopDetails.shopName} t={t} data={data} />;
            default: return null;
        }
    };

    return (
        <div className={`fixed inset-0 z-[60] overflow-y-auto ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-black'}`}>{!activeTool && (<div className={`sticky top-0 p-4 border-b flex items-center gap-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}><button onClick={handleBackFromTool} className="p-2 rounded-full hover:bg-gray-100/10"><ArrowLeft size={24} /></button><h2 className="text-xl font-bold flex items-center gap-2">{t('Business Tools')}</h2></div>)}<div className="relative p-0 m-0 max-w-md mx-auto h-[calc(100vh-73px)] h-full">
                {!activeTool && (
                    <div className="p-4 grid grid-cols-2 gap-3 mt-2">
                        {tools.map(tool => {
                            const isPinned = pinnedTools.includes(tool.id);
                            return (
                                <div
                                    key={tool.id}
                                    className={`relative p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-lg shadow-sm'}`}
                                    onClick={() => setActiveTool(tool.id)}
                                >
                                    <div className={`p-3 rounded-2xl ${tool.color} shadow-sm`}>{tool.icon}</div>
                                    <span className="font-bold text-sm text-center">{t(tool.name)}</span>
                                    <span className="text-[10px] text-gray-500 text-center">{tool.desc}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onTogglePin(tool.id); }}
                                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${isPinned ? 'text-blue-500 bg-blue-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {isPinned ? <Pin size={14} fill="currentColor" /> : <Pin size={14} />}
                                    </button>
                                </div>
                            );
                        })}
                        <div className="col-span-2 text-center text-xs opacity-50 mt-4 flex items-center justify-center gap-1">
                            <Pin size={10} /> Pin tools to Home Screen for quick access
                        </div>
                    </div>
                )}
                {activeTool && <div className="animate-in slide-in-from-right duration-300 h-full w-full absolute top-0 left-0 bg-white dark:bg-slate-900">{renderToolContent()}</div>}
            </div>
        </div>
    );
};
export default ToolsHub;

















