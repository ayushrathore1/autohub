import React from 'react';
import { PenTool, CheckCircle, Type, Vibrate, AlertCircle, Zap, Palette, Monitor, LayoutGrid } from 'lucide-react';
import { AppData, ThemeOption } from '../../types';

interface AppearanceSettingsProps {
    isDark: boolean;
    t: (key: string) => string;
    data: AppData;
    pushToFirebase: (data: AppData) => void;
    themeOptions: ThemeOption[];
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
    isDark, t, data, pushToFirebase, themeOptions
}) => {

    const accentColors = [
        { id: 'blue', color: 'bg-blue-500', shadow: 'shadow-blue-500/50', ring: 'ring-blue-500' },
        { id: 'purple', color: 'bg-purple-500', shadow: 'shadow-purple-500/50', ring: 'ring-purple-500' },
        { id: 'rose', color: 'bg-rose-500', shadow: 'shadow-rose-500/50', ring: 'ring-rose-500' },
        { id: 'emerald', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/50', ring: 'ring-emerald-500' },
        { id: 'amber', color: 'bg-amber-500', shadow: 'shadow-amber-500/50', ring: 'ring-amber-500' },
    ];

    const currentTheme = data.settings?.theme || 'light';
    const currentAccent = data.settings?.accentColor || 'blue';
    const currentFontSize = data.settings?.fontSize || 'Medium';
    const currentDensity = data.settings?.density || 'comfortable';

    // Helper for settings updates
    const updateSetting = (key: string, value: any) => {
        pushToFirebase({
            ...data,
            settings: { ...data.settings, [key]: value }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-400 max-w-4xl mx-auto pb-24">
            
            {/* Header */}
            <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} relative overflow-hidden`}>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-lg shadow-pink-500/30">
                        <Palette size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-2xl">{t("Appearance")}</h2>
                        <p className="opacity-70 text-sm">{t("Customize your workspace visually")}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Theme Mode */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <Monitor size={20} className="text-pink-500" />
                            <h3 className="font-bold text-lg">{t("Theme Mode")}</h3>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {themeOptions.map((theme) => {
                                const isSelected = currentTheme === theme.id;
                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => updateSetting('theme', theme.id)}
                                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300
                                        ${isSelected
                                            ? 'border-pink-500 bg-pink-50/10 scale-105 shadow-md shadow-pink-500/20'
                                            : isDark ? 'border-slate-700 hover:border-slate-500' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex gap-1">
                                            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: theme.colors[0] }}></div>
                                            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: theme.colors[1] }}></div>
                                        </div>
                                        <span className={`text-xs font-bold ${isSelected ? 'text-pink-500' : 'opacity-70'}`}>
                                            {t(theme.name)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Accent Colors */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <PenTool size={16} className="text-purple-500" />
                            </div>
                            <h3 className="font-bold">{t("Accent Color")}</h3>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {accentColors.map((accent) => {
                                const isSelected = currentAccent === accent.id;
                                return (
                                    <button
                                        key={accent.id}
                                        onClick={() => updateSetting('accentColor', accent.id)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative
                                        ${accent.color} ${isSelected ? `scale-125 shadow-lg ${accent.shadow} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ${accent.ring}` : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                                    >
                                        {isSelected && <CheckCircle size={16} className="text-white drop-shadow-md" />}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs opacity-50 mt-4 leading-relaxed">
                            {t("Changes the primary color of buttons, badges, and highlights across the app.")}
                        </p>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Typography & Layout */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Type size={16} className="text-blue-500" />
                            </div>
                            <h3 className="font-bold">{t("Typography & Size")}</h3>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold opacity-60 uppercase tracking-wider mb-3 block">{t("Font Size")}</label>
                                <div className={`flex p-1 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
                                    {['Small', 'Medium', 'Large'].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => updateSetting('fontSize', size)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                                            ${currentFontSize === size
                                                ? 'bg-white dark:bg-slate-700 shadow-md text-blue-500 scale-100'
                                                : 'opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-slate-800/50 scale-95'}`}
                                        >
                                            <span className={size === 'Small' ? 'text-xs' : size === 'Large' ? 'text-base' : 'text-sm'}>
                                                Aa
                                            </span>
                                            <span className="ml-2 hidden sm:inline">{t(size)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold opacity-60 uppercase tracking-wider mb-3 block flex items-center gap-2">
                                    <LayoutGrid size={12}/> {t("UI Layout Density")}
                                </label>
                                <div className={`flex p-1 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
                                    {[
                                        { id: 'compact', label: 'Compact' },
                                        { id: 'comfortable', label: 'Comfortable' }
                                    ].map(density => (
                                        <button
                                            key={density.id}
                                            onClick={() => updateSetting('density', density.id)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                                            ${currentDensity === density.id
                                                ? 'bg-white dark:bg-slate-700 shadow-md text-pink-500'
                                                : 'opacity-60 hover:opacity-100'}`}
                                        >
                                            {t(density.label)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Accessibility & Effects */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Zap size={16} className="text-orange-500" />
                            </div>
                            <h3 className="font-bold">{t("Effects & Accessibility")}</h3>
                        </div>

                        <div className="space-y-3">
                            {[
                                { id: 'soundEffects', icon: Vibrate, label: 'Sound Effects', desc: 'App sounds and haptics' },
                                { id: 'highContrast', icon: AlertCircle, label: 'High Contrast', desc: 'Sharper borders and pure colors' },
                                { id: 'reducedMotion', icon: Zap, label: 'Reduced Motion', desc: 'Disable fancy animations and zooms' },
                            ].map(item => {
                                const isEnabled = item.id === 'soundEffects' ? data.settings?.soundEffects !== false : data.settings?.[item.id] === true;
                                return (
                                    <div key={item.id} className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-gray-50/50 border-gray-100'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl border ${isEnabled ? (isDark ? 'bg-pink-900/20 text-pink-500 border-pink-500/30' : 'bg-pink-100 text-pink-600 border-pink-200') : (isDark ? 'bg-slate-800 text-gray-500 border-slate-700' : 'bg-white text-gray-400 border-gray-200')}`}>
                                                    <item.icon size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{t(item.label)}</p>
                                                    <p className="text-[11px] opacity-60">{t(item.desc)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => updateSetting(item.id, !isEnabled)}
                                                className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:ring-4 ${isEnabled ? 'bg-pink-500 focus:ring-pink-500/30' : 'bg-gray-300 dark:bg-slate-600 focus:ring-gray-400/30'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isEnabled ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default AppearanceSettings;
