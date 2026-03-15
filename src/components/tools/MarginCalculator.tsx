import React, { useState } from 'react';
import { Target, ArrowLeft } from 'lucide-react';

interface MarginCalculatorProps {
    t: (key: string) => string;
    isDark?: boolean;
    onBack?: () => void;
}

const MarginCalculator: React.FC<MarginCalculatorProps> = ({ t, isDark, onBack }) => {
    const [cost, setCost] = useState('');
    const [margin, setMargin] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [calcType, setCalcType] = useState('margin'); // margin, sell_price

    const commonInputClass = `w-full ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-xl p-4 font-bold text-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center h-16`;

    const c = parseFloat(cost) || 0;
    const m = parseFloat(margin) || 0;
    const spInput = parseFloat(sellPrice) || 0;

    let calMargin = 0, calSellPrice = 0, profit = 0;

    if (calcType === 'margin') {
        calSellPrice = c / (1 - m / 100);
        profit = calSellPrice - c;
        calMargin = m;
    } else {
        profit = spInput - c;
        calMargin = c > 0 ? (profit / spInput) * 100 : 0;
        calSellPrice = spInput;
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
                    <Target className="text-purple-500" size={24} />
                    {t('Margin Calculator')}
                </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div className={`flex gap-2 p-1.5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-200/50'}`}>
                    <button
                        onClick={() => setCalcType('margin')}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${calcType === 'margin' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        Target Margin %
                    </button>
                    <button
                        onClick={() => setCalcType('sell_price')}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${calcType === 'sell_price' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        Target Sell Price
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-center text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cost Price</label>
                        <input
                            type="number"
                            placeholder="₹ 0"
                            className={commonInputClass}
                            value={cost}
                            onChange={e => setCost(e.target.value)}
                        />
                    </div>
                    {calcType === 'margin' ? (
                        <div>
                            <label className={`block text-center text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Margin %</label>
                            <input
                                type="number"
                                placeholder="..."
                                className={commonInputClass}
                                value={margin}
                                onChange={e => setMargin(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className={`block text-center text-xs font-bold uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sell Price</label>
                            <input
                                type="number"
                                placeholder="₹ 0"
                                className={commonInputClass}
                                value={sellPrice}
                                onChange={e => setSellPrice(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {calcType === 'margin' && (
                    <div>
                        <label className={`block mb-2 text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quick Margins</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[10, 15, 20, 25].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setMargin(r.toString())}
                                    className={`py-3 rounded-xl font-black transition-all ${parseFloat(margin) === r ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-slate-900' : isDark ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 shadow-sm'}`}
                                >
                                    {r}%
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end pb-3 border-b border-dashed border-gray-200 dark:border-slate-700">
                            <span className={isDark ? 'text-gray-400 font-medium' : 'text-gray-500 font-medium'}>Net Profit</span>
                            <span className="font-bold text-lg text-emerald-500">₹{profit.toFixed(2)}</span>
                        </div>
                        {calcType === 'margin' && (
                            <div className="flex justify-between items-end pb-3 border-b border-dashed border-gray-200 dark:border-slate-700">
                                <span className={isDark ? 'text-gray-400 font-medium' : 'text-gray-500 font-medium'}>Selling Price</span>
                                <span className="font-bold text-xl text-blue-500">₹{calSellPrice.toFixed(2)}</span>
                            </div>
                        )}
                        {calcType === 'sell_price' && (
                            <div className="flex justify-between items-end pb-3 border-b border-dashed border-gray-200 dark:border-slate-700">
                                <span className={isDark ? 'text-gray-400 font-medium' : 'text-gray-500 font-medium'}>Margin Acquired</span>
                                <span className="font-bold text-xl text-purple-500">{calMargin.toFixed(2)}%</span>
                            </div>
                        )}
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1 font-bold tracking-wider">
                                <span>COST: ₹{c.toFixed(2)}</span>
                                <span>SELL: ₹{calSellPrice.toFixed(2)}</span>
                            </div>
                            <div className={`w-full rounded-full h-3 flex overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
                                <div className="bg-gray-400 h-full transition-all" style={{ width: `${(c / calSellPrice) * 100}%` }}></div>
                                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(profit / calSellPrice) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarginCalculator;
