import React, { useState } from 'react';
import { RefreshCcw, ArrowLeft } from 'lucide-react';

interface UnitConverterProps {
    isDark?: boolean;
    t?: (key: string) => string;
    onBack?: () => void;
}

const UnitConverter: React.FC<UnitConverterProps> = ({ isDark = false, t = (k: string) => k, onBack }) => {
    const [convInput, setConvInput] = useState({ val: '', type: 'kgToTon' });

    // Native App Styles
    const cardClass = `h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`;
    const commonInputClass = `w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mb-4 ${isDark ? 'text-white' : 'text-black'}`;

    const convert = (val: number, type: string) => {
        switch (type) {
            case 'kgToTon': return val / 1000;
            case 'tonToKg': return val * 1000;
            case 'inToMm': return val * 25.4;
            case 'mmToIn': return val / 25.4;
            default: return 0;
        }
    };

    const result = convInput.val ? convert(Number(convInput.val), convInput.type).toFixed(4) : '0';

    return (
        <div className={cardClass}>
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                {onBack && (
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />
                    </button>
                )}
                <h3 className="font-bold text-xl flex items-center gap-2">
                    <RefreshCcw className="text-green-500" size={24} />
                    {t('Unit Converter')}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                <div className="grid grid-cols-2 gap-2 mb-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-gray-100 dark:border-slate-700 shrink-0">
                    <button onClick={() => setConvInput({ ...convInput, type: 'kgToTon' })} className={`p-2 text-sm font-bold rounded-lg ${convInput.type === 'kgToTon' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>KG ➔ Ton</button>
                    <button onClick={() => setConvInput({ ...convInput, type: 'tonToKg' })} className={`p-2 text-sm font-bold rounded-lg ${convInput.type === 'tonToKg' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>Ton ➔ KG</button>
                    <button onClick={() => setConvInput({ ...convInput, type: 'inToMm' })} className={`p-2 text-sm font-bold rounded-lg ${convInput.type === 'inToMm' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>Inch ➔ mm</button>
                    <button onClick={() => setConvInput({ ...convInput, type: 'mmToIn' })} className={`p-2 text-sm font-bold rounded-lg ${convInput.type === 'mmToIn' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>mm ➔ Inch</button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center flex-1">
                    <input
                        type="number"
                        className={commonInputClass}
                        placeholder={t("Enter Value")}
                        value={convInput.val}
                        onChange={e => setConvInput({ ...convInput, val: e.target.value })}
                    />
                    <div className="flex justify-center w-full my-4">
                        <RefreshCcw size={24} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <div className="w-full text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
                        <span className="text-3xl font-black text-green-700 dark:text-green-400">{result}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnitConverter;
