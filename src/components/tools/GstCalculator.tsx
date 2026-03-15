import React, { useState } from 'react';
import { Percent, Copy, ArrowLeft } from 'lucide-react';

interface GstCalculatorProps {
    t: (key: string) => string;
    isDark?: boolean;
    onBack?: () => void;
}

const GstCalculator: React.FC<GstCalculatorProps> = ({ t, isDark, onBack }) => {
    const [gstInput, setGstInput] = useState({ price: '', rate: 18, isReverse: false });

    // Shared Styles
    const commonInputClass = `w-full ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-xl p-4 font-bold text-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mb-4`;
    
    const price = parseFloat(gstInput.price) || 0;
    let gstAmt = 0, finalAmt = 0, baseAmt = 0, cgst = 0, sgst = 0, igst = 0;

    if (gstInput.isReverse) {
        baseAmt = (price * 100) / (100 + gstInput.rate);
        gstAmt = price - baseAmt;
        finalAmt = price;
    } else {
        baseAmt = price;
        gstAmt = (price * gstInput.rate) / 100;
        finalAmt = price + gstAmt;
    }

    cgst = sgst = gstAmt / 2;
    igst = gstAmt;

    return (
        <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <div className={`flex items-center gap-3 p-4 border-b shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                {onBack && (
                    <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                        <ArrowLeft size={22} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
                    </button>
                )}
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Percent className="text-blue-500" size={24} />
                    GST Pro
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div className={`flex gap-2 p-1.5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-200/50'}`}>
                    <button
                        onClick={() => setGstInput({ ...gstInput, isReverse: false })}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${!gstInput.isReverse ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        Add GST (+%)
                    </button>
                    <button
                        onClick={() => setGstInput({ ...gstInput, isReverse: true })}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${gstInput.isReverse ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        Remove GST (-%)
                    </button>
                </div>

                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">₹</span>
                    <input
                        type="number"
                        placeholder={gstInput.isReverse ? "Total Amount (Inc. GST)" : "Base Amount"}
                        className={`${commonInputClass} pl-10 h-16 text-2xl`}
                        value={gstInput.price}
                        onChange={e => setGstInput({ ...gstInput, price: e.target.value })}
                    />
                </div>

                <div>
                    <label className={`block mb-2 text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>GST Rate</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[5, 12, 18, 28].map(r => (
                            <button
                                key={r}
                                onClick={() => setGstInput({ ...gstInput, rate: r })}
                                className={`py-3 rounded-xl font-black transition-all ${gstInput.rate === r ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900' : isDark ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 shadow-sm'}`}
                            >
                                {r}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    <div className="space-y-3">
                        <div className="flex justify-between items-end pb-3 border-b border-dashed border-gray-200 dark:border-slate-700">
                            <span className={isDark ? 'text-gray-400 font-medium' : 'text-gray-500 font-medium'}>Base Amount</span>
                            <span className="font-bold text-lg">₹{baseAmt.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-end pb-3 border-b border-dashed border-gray-200 dark:border-slate-700">
                            <span className={isDark ? 'text-gray-400 font-medium' : 'text-gray-500 font-medium'}>Total GST ({gstInput.rate}%)</span>
                            <span className="font-bold text-lg text-blue-500">₹{gstAmt.toFixed(2)}</span>
                        </div>

                        {gstAmt > 0 && (
                            <div className={`rounded-xl p-3 my-2 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">CGST ({gstInput.rate / 2}%)</p>
                                        <p className="font-mono font-bold text-sm">₹{cgst.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">SGST ({gstInput.rate / 2}%)</p>
                                        <p className="font-mono font-bold text-sm">₹{sgst.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-end pt-2">
                            <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Final Amount</span>
                            <span className="text-3xl font-black text-green-500">₹{finalAmt.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-4 shrink-0 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                <button
                    onClick={() => navigator.clipboard.writeText(`GST Calculation\n---------------\nBase: ₹${baseAmt.toFixed(2)}\nGST @${gstInput.rate}%: ₹${gstAmt.toFixed(2)}\n  CGST: ₹${cgst.toFixed(2)}\n  SGST: ₹${sgst.toFixed(2)}\n---------------\nTotal: ₹${finalAmt.toFixed(2)}`)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                >
                    <Copy size={20} /> Copy Details
                </button>
            </div>
        </div>
    );
};

export default GstCalculator;
