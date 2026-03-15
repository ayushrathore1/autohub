import React, { useState } from 'react';
import { DollarSign, ArrowLeft } from 'lucide-react';

interface EmiCalculatorProps {
    isDark?: boolean;
    onBack?: () => void;
}

const EmiCalculator: React.FC<EmiCalculatorProps> = ({ isDark, onBack }) => {
    const [emiInput, setEmiInput] = useState({ principal: '', rate: '', tenure: '', tenureType: 'months' });

    const commonInputClass = `w-full ${isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} border rounded-xl p-4 font-bold text-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`;

    const p = parseFloat(emiInput.principal) || 0;
    const r = parseFloat(emiInput.rate) || 0;
    const t = parseFloat(emiInput.tenure) || 0;
    let emi = 0, totalPay = 0, totalInt = 0;

    if (p > 0 && r > 0 && t > 0) {
        const monthlyR = r / 12 / 100;
        const months = emiInput.tenureType === 'years' ? t * 12 : t;
        emi = (p * monthlyR * Math.pow(1 + monthlyR, months)) / (Math.pow(1 + monthlyR, months) - 1);
        totalPay = emi * months;
        totalInt = totalPay - p;
    }

    return (
        <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className={`flex items-center gap-3 p-4 border-b shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                {onBack && (
                    <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                        <ArrowLeft size={22} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
                    </button>
                )}
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <DollarSign className="text-emerald-500" size={24} />
                    EMI Calculator
                </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                    <label className={`block text-xs font-bold uppercase mb-2 ml-1 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loan Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-400">₹</span>
                        <input
                            type="number"
                            placeholder="0"
                            className={`${commonInputClass} pl-10 text-xl`}
                            value={emiInput.principal}
                            onChange={e => setEmiInput({ ...emiInput, principal: e.target.value })}
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 ml-1 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Interest Rate</label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0"
                                className={`${commonInputClass} pr-10`}
                                value={emiInput.rate}
                                onChange={e => setEmiInput({ ...emiInput, rate: e.target.value })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">%</span>
                        </div>
                    </div>
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 ml-1 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tenure</label>
                        <div className={`flex rounded-xl border overflow-hidden transition-all ${isDark ? 'border-slate-700 bg-slate-900 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20' : 'border-gray-200 bg-gray-50 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'}`}>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full p-4 font-bold text-lg outline-none bg-transparent"
                                value={emiInput.tenure}
                                onChange={e => setEmiInput({ ...emiInput, tenure: e.target.value })}
                            />
                            <select
                                className={`px-2 font-bold text-xs outline-none cursor-pointer ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200/50 text-gray-700'}`}
                                value={emiInput.tenureType}
                                onChange={e => setEmiInput({ ...emiInput, tenureType: e.target.value })}
                            >
                                <option value="months">Mo</option>
                                <option value="years">Yr</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <div className={`p-6 rounded-3xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
                        {emi > 0 ? (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className={`text-sm font-bold tracking-widest uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monthly EMI</p>
                                    <p className="text-4xl font-black text-emerald-500">₹{Math.round(emi).toLocaleString('en-IN')}</p>
                                </div>
                                <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Interest</p>
                                        <p className={`font-mono font-bold text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>+₹{Math.round(totalInt).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center border-l border-gray-200 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Payment</p>
                                        <p className={`font-mono font-bold text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>₹{Math.round(totalPay).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-6 opacity-50">
                                <DollarSign size={48} className="mx-auto mb-3 text-gray-400" />
                                <p className="font-medium text-gray-500">Enter loan details to calculate EMI</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmiCalculator;
