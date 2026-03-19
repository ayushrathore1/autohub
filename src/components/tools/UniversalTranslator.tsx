import React, { useState } from 'react';
import { Languages, ArrowLeft, RefreshCw, Volume2, Copy, Check } from 'lucide-react';
import { translateWithGoogle } from '../../lib/translation';
import VoiceInput from '../VoiceInput';

export const UniversalTranslator: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void; }> = ({ isDark, t, onBack }) => {
    const [sourceText, setSourceText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [sourceLang, setSourceLang] = useState('auto');
    const [targetLang, setTargetLang] = useState('en');
    const [copied, setCopied] = useState(false);

    const languages = [
        { code: 'auto', name: 'Auto Detect' },
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'mr', name: 'Marathi' },
        { code: 'gu', name: 'Gujarati' },
        { code: 'ta', name: 'Tamil' },
        { code: 'bn', name: 'Bengali' },
        { code: 'te', name: 'Telugu' },
        { code: 'kn', name: 'Kannada' },
        { code: 'ml', name: 'Malayalam' },
        { code: 'pa', name: 'Punjabi' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'ar', name: 'Arabic' }
    ];

    const handleTranslate = async () => {
        if (!sourceText.trim()) return;
        setIsTranslating(true);
        if (navigator.vibrate) navigator.vibrate(50);
        try {
            const fromLang = sourceLang === 'auto' ? 'auto' : sourceLang;
            const result = await translateWithGoogle(sourceText, fromLang, targetLang);
            setTranslatedText(result);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCopy = () => {
        if (!translatedText) return;
        navigator.clipboard.writeText(translatedText);
        setCopied(true);
        if (navigator.vibrate) navigator.vibrate(50);
        setTimeout(() => setCopied(false), 2000);
    };

    const speak = (text: string, lang: string) => {
        if (!text || !window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'auto' ? 'en-US' : lang; // fallback to English if auto
        window.speechSynthesis.speak(utterance);
    };

    const swapLanguages = () => {
        if (sourceLang !== 'auto') {
            const temp = sourceLang;
            setSourceLang(targetLang);
            setTargetLang(temp);
            setSourceText(translatedText);
            setTranslatedText('');
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className={`flex items-center gap-3 p-4 shadow-sm border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Languages size={20} className="text-blue-500" />
                        Universal Translator
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Powered by Google Translate</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Language Selectors */}
                <div className={`flex items-center justify-between p-3 rounded-2xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className={`flex-1 bg-transparent text-sm font-bold outline-none border-none p-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                        {languages.map(l => <option key={`src-${l.code}`} value={l.code} className={isDark ? 'bg-slate-800' : 'bg-white'}>{l.name}</option>)}
                    </select>

                    <button onClick={swapLanguages} className={`p-2 rounded-full mx-2 transition-transform hover:rotate-180 ${sourceLang === 'auto' ? 'opacity-50 cursor-not-allowed' : 'text-blue-500 bg-blue-50 dark:bg-slate-700'}`}>
                        <RefreshCw size={18} />
                    </button>

                    <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className={`flex-1 bg-transparent text-sm font-bold text-right outline-none border-none p-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                        dir="rtl"
                    >
                        {languages.filter(l => l.code !== 'auto').map(l => <option key={`tgt-${l.code}`} value={l.code} className={isDark ? 'bg-slate-800' : 'bg-white'}>{l.name}</option>)}
                    </select>
                </div>

                {/* Input Area */}
                <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">From</span>
                        <div className="flex gap-2">
                           <button onClick={() => speak(sourceText, sourceLang)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                               <Volume2 size={16} />
                           </button>
                        </div>
                    </div>
                    <div className="relative p-2">
                        <textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="Type text to translate..."
                            className={`w-full min-h-[120px] p-3 text-lg resize-none outline-none bg-transparent ${isDark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
                            dir="auto"
                        />
                        <div className="absolute right-3 bottom-3 flex gap-2">
                             <VoiceInput 
                                onResult={(text) => {
                                    setSourceText(prev => prev ? prev + ' ' + text : text);
                                }}
                                isDark={isDark}
                                lang={sourceLang === 'auto' ? 'en-IN' : sourceLang}
                             />
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !sourceText.trim()}
                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        isTranslating || !sourceText.trim() ? 'opacity-50 bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl'
                    }`}
                >
                    {isTranslating ? (
                        <><RefreshCw className="animate-spin" size={20} /> Translating...</>
                    ) : (
                        <><Languages size={20} /> Translate Now</>
                    )}
                </button>

                {/* Output Area */}
                {translatedText && (
                    <div className={`rounded-2xl border shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-blue-50 border-blue-200'}`}>
                        <div className={`p-3 border-b flex justify-between items-center ${isDark ? 'border-indigo-500/30 bg-indigo-900/40' : 'border-blue-100 bg-blue-100/50'}`}>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Translation</span>
                            <div className="flex gap-2">
                                <button onClick={() => speak(translatedText, targetLang)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors">
                                    <Volume2 size={16} />
                                </button>
                                <button onClick={handleCopy} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors">
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="p-5">
                            <p className="text-xl font-medium whitespace-pre-wrap" dir="auto">{translatedText}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default UniversalTranslator;