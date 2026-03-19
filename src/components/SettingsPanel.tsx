import React, { useState, useEffect } from 'react';
import {
    Store, Activity, PenTool, Bell, Shield, Download, HelpCircle,
    CheckCircle, Lock, ShieldCheck, Layers, Settings, FileText,
    MessageSquare, ExternalLink, LogOut, ChevronRight, Zap
} from 'lucide-react';

import { AppData, User, ThemePreset } from '../types';

import ProfileSettings from './settings/ProfileSettings';
import AppearanceSettings from './settings/AppearanceSettings';
import NotificationSettings from './settings/NotificationSettings';
import SecuritySettings from './settings/SecuritySettings';
import DataManagement from './settings/DataManagement';

interface SettingsPanelProps {
    isDark: boolean;
    t: (key: string) => string;
    settingsUnlocked: boolean;
    handleSettingsUnlock: () => void;
    settingsPassInput: string;
    setSettingsPassInput: (val: string) => void;
    settingsTab: string;
    setSettingsTab: (val: string) => void;
    data: AppData;
    setData: (data: AppData) => void;
    pushToFirebase: (data: AppData) => void;
    user: User;
    setView: (view: string) => void;
    deferredPrompt: any; // PWA event type is complex, keeping any for now or using BeforeInstallPromptEvent if declared
    setDeferredPrompt: (prompt: any) => void;
    showToast: (msg: string, type?: string) => void;
    themePreset: ThemePreset;
    notifPermission: string;
    requestNotificationPermission: () => void;
    setIsPrivacyOpen: (open: boolean) => void;
    setIsFaqOpen: (open: boolean) => void;
    handleLogout: () => void;
    triggerConfirm: (title: string, msg: string, isDanger: boolean, onConfirm: () => void) => void;
    setPreviousView: (view: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isDark, t, settingsUnlocked, handleSettingsUnlock, settingsPassInput, setSettingsPassInput,
    settingsTab, setSettingsTab, data, setData, pushToFirebase, user, setView,
    deferredPrompt, setDeferredPrompt, showToast, themePreset, notifPermission,
    requestNotificationPermission, setIsPrivacyOpen, setIsFaqOpen, handleLogout, triggerConfirm, setPreviousView
}) => {

    const settingsTabs = [
        { id: 'profile', icon: Store, label: t('Profile'), color: 'from-purple-500 to-indigo-500' },
        { id: 'ai', icon: Activity, label: t('AI'), color: 'from-blue-500 to-cyan-500' },
        { id: 'appearance', icon: PenTool, label: t('Theme'), color: 'from-pink-500 to-rose-500' },
        { id: 'notifications', icon: Bell, label: t('Alerts'), color: 'from-green-500 to-emerald-500' },
        { id: 'security', icon: Shield, label: t('Security'), color: 'from-red-500 to-orange-500' },
        { id: 'backup', icon: Download, label: t('Backup'), color: 'from-cyan-500 to-blue-500' },
        { id: 'help', icon: HelpCircle, label: t('Help'), color: 'from-gray-500 to-slate-500' },
    ];

    const themeOptions = [
        { id: 'light', name: t('Light'), colors: ['#ffffff', '#000000', '#000000'] },
        { id: 'dark', name: t('Dark'), colors: ['#000000', '#ffffff', '#ffffff'] },
        { id: 'auto', name: t('Auto'), colors: ['#1e293b', '#ffffff', '#8b5cf6'] },
    ];

    if (!settingsUnlocked) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-black'}`}>
                <div className="bg-red-100 text-red-600 w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 border-red-200"><Lock size={40} /></div>
                <h2 className="text-xl font-bold mb-4">{t("Security Check")}</h2>
                <p className="mb-4 text-center opacity-70">{t("Enter Product Password to Access Settings")}</p>
                <input type="password" placeholder={t("Product Password")} className={`w-full max-w-xs p-3 text-center text-xl rounded border mb-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`} value={settingsPassInput} onChange={e => setSettingsPassInput(e.target.value)} />
                <button onClick={handleSettingsUnlock} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg active:scale-95 transition-all">{t("UNLOCK SETTINGS")}</button>

                <div className="mt-8 flex items-center justify-center gap-2 text-green-600 bg-green-50 p-2 rounded-full px-4 border border-green-200">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t("Secured by Autonex")}</span>
                </div>
            </div>
        );
    }

    return (
          <div className={`pb-24 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-300 ${isDark ? 'text-white' : 'text-black'}`} style={{ backgroundColor: themePreset.bg }}>
            {/* Header */}
            <div className={`sticky top-0 z-40 p-4 backdrop-blur-xl ${isDark ? 'bg-slate-900/90' : 'bg-gray-50/90'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Settings /> {t("Settings")}</h2>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    {settingsTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSettingsTab(tab.id as any)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${settingsTab === tab.id
                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105`
                                : isDark ? 'bg-slate-800 text-gray-400 hover:bg-slate-700' : 'bg-white text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4">
                {/* ?? PROFILE TAB */}
                {settingsTab === 'profile' && (
                    <ProfileSettings
                        isDark={isDark}
                        t={t}
                        data={data}
                        user={user}
                        pushToFirebase={(d) => { setData(d); pushToFirebase(d); }}
                        showToast={showToast}
                        setView={setView}
                        setPreviousView={setPreviousView}
                        deferredPrompt={deferredPrompt}
                        setDeferredPrompt={setDeferredPrompt}
                    />
                )}

                {/* ?? AI TAB */}
                {settingsTab === 'ai' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                                    <Activity size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t("AI & Smart Features")}</h3>
                                    <p className="text-xs opacity-60">{t("Powered by Machine Learning")}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { id: 'fuzzySearch', icon: Layers, label: t('Fuzzy Search'), desc: t('Find items with typos'), gradient: 'from-orange-500 to-amber-500' },
                                    { id: 'autoCategory', icon: Layers, label: t('Auto Categorization'), desc: t('AI groups products'), gradient: 'from-pink-500 to-rose-500' },
                                ].map(item => (
                                    (() => {
                                        const defaultOn = item.id === 'fuzzySearch';
                                        const isEnabled = defaultOn ? data.settings?.[item.id] !== false : !!data.settings?.[item.id];
                                        return (
                                            <div key={item.id} className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${item.gradient}`}>
                                                        <item.icon size={16} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold">{item.label}</p>
                                                        <p className="text-[10px] opacity-50">{item.desc}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const nextEnabled = !isEnabled;
                                                        const newData = { ...data, settings: { ...data.settings, [item.id]: nextEnabled } };
                                                        setData(newData);
                                                        pushToFirebase(newData);
                                                    }}
                                                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${isEnabled ? `bg-gradient-to-r ${item.gradient}` : 'bg-gray-300'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${isEnabled ? 'left-5' : 'left-0.5'}`}></div>
                                                </button>
                                            </div>
                                        );
                                    })()
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ?? APPEARANCE TAB */}
                {settingsTab === 'appearance' && (
                    <AppearanceSettings
                        isDark={isDark}
                        t={t}
                        data={data}
                        pushToFirebase={(d) => { setData(d); pushToFirebase(d); }}
                        themeOptions={themeOptions}
                    />
                )}

                {/* ?? NOTIFICATIONS TAB */}
                {settingsTab === 'notifications' && (
                    <NotificationSettings
                        isDark={isDark}
                        t={t}
                        data={data}
                        pushToFirebase={(d) => { setData(d); pushToFirebase(d); }}
                        notifPermission={notifPermission}
                        requestNotificationPermission={requestNotificationPermission}
                        triggerConfirm={triggerConfirm}
                    />
                )}

                {/* ?? SECURITY TAB */}
                {settingsTab === 'security' && (
                    <SecuritySettings
                        isDark={isDark}
                        t={t}
                        data={data}
                        pushToFirebase={(d) => { setData(d); pushToFirebase(d); }}
                        triggerConfirm={triggerConfirm}
                        showToast={showToast}
                    />
                )}

                {/* ?? BACKUP TAB */}
                {settingsTab === 'backup' && (
                    <DataManagement
                        isDark={isDark}
                        t={t}
                        data={data}
                        setData={setData}
                        pushToFirebase={(d) => { setData(d); pushToFirebase(d); }}
                        showToast={showToast}
                        triggerConfirm={triggerConfirm}
                    />
                )}

                {/* ? HELP TAB */}
                {settingsTab === 'help' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-gradient-to-br from-gray-500 to-slate-500 rounded-2xl shadow-lg">
                                    <HelpCircle size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t("Help & Support")}</h3>
                                    <p className="text-xs opacity-60">{t("Get assistance")}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button onClick={() => setIsPrivacyOpen(true)} className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <FileText size={20} className="text-gray-500" />
                                    <span className="font-semibold">{t("Privacy Policy")}</span>
                                    <ChevronRight size={16} className="ml-auto opacity-50" />
                                </button>
                                <button onClick={() => setIsFaqOpen(true)} className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <HelpCircle size={20} className="text-blue-500" />
                                    <span className="font-semibold">{t("FAQ")}</span>
                                    <ChevronRight size={16} className="ml-auto opacity-50" />
                                </button>
                                <a href="tel:8619152422" className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <MessageSquare size={20} className="text-green-500" />
                                    <span className="font-semibold">{t("Contact Support")}</span>
                                    <ExternalLink size={14} className="ml-auto opacity-50" />
                                </a>
                            </div>
                        </div>

                        {/* Logout */}
                        <button onClick={handleLogout} className="w-full py-3 border-2 border-red-400 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2">
                            <LogOut size={20} /> {t("Logout")}
                        </button>

                        {/* App Info */}
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gradient-to-br from-slate-800 via-purple-900/30 to-blue-900/30 border-purple-500/30' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-purple-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <Zap size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{data.settings?.shopName || 'Autonex'}</p>
                                        <p className="text-[10px] opacity-50">v3.0 Pro Edition</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] font-bold text-white flex items-center gap-1">
                                    <ShieldCheck size={10} /> PRO
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] mb-3">
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
                                    <Activity size={14} className="mx-auto text-purple-500 mb-1" />
                                    <span className="font-semibold">{t("AI Powered")}</span>
                                </div>
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
                                    <Shield size={14} className="mx-auto text-green-500 mb-1" />
                                    <span className="font-semibold">{t("Secure")}</span>
                                </div>
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
                                    <Download size={14} className="mx-auto text-blue-500 mb-1" />
                                    <span className="font-semibold">{t("Cloud Sync")}</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-[9px] uppercase tracking-widest opacity-50 mb-1">{t("Developed By")}</p>
                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                                    <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                        <Zap size={10} className="text-white" />
                                    </div>
                                    <span className="font-bold text-xs">Autonex</span>
                                    <CheckCircle size={12} className="text-blue-500" />
                                </div>
                                <p className="text-[8px] mt-2 opacity-40">  2025 All Rights Reserved</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="h-24"></div>
        </div>
    );
};

export default SettingsPanel;
