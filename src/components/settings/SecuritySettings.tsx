import React, { useState } from 'react';
import { Shield, Clock, Lock, CheckCircle, DatabaseBackup, KeyRound, Fingerprint, EyeOff, AlertTriangle } from 'lucide-react';
import { AppData } from '../../types';

interface SecuritySettingsProps {
    isDark: boolean;
    t: (key: string) => string;
    data: AppData;
    pushToFirebase: (data: AppData) => void;
    triggerConfirm: (title: string, msg: string, isDanger: boolean, onConfirm: () => void) => void;
    showToast: (msg: string, type?: string) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
    isDark, t, data, pushToFirebase, triggerConfirm, showToast
}) => {
    const [newProductPass, setNewProductPass] = useState('');
    const [showPass, setShowPass] = useState(false);

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
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg shadow-red-500/30">
                        <Shield size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-2xl">{t("Security")}</h2>
                        <p className="opacity-70 text-sm">{t("Protect your inventory and billing data")}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Authentication Column */}
                <div className="space-y-6">
                    {/* Change Password */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <KeyRound size={20} className="text-orange-500" />
                            <h3 className="font-bold text-lg">{t("Access Control")}</h3>
                        </div>
                        
                        <div className={`p-4 rounded-2xl border mb-3 ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-gray-50/50 border-gray-200'}`}>
                            <p className="text-xs font-bold opacity-60 mb-2 uppercase tracking-wider">{t("App Master Password")}</p>
                            <div className="relative mb-3">
                                <input
                                    type={showPass ? "text" : "password"}
                                    placeholder={t("Enter new password")}
                                    className={`w-full p-3 rounded-xl border-2 font-medium ${isDark ? 'bg-slate-800 border-slate-600 focus:border-orange-500' : 'bg-white border-gray-200 focus:border-orange-500'} outline-none transition-colors pr-10`}
                                    value={newProductPass}
                                    onChange={e => setNewProductPass(e.target.value)}
                                />
                                <button 
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-3.5 opacity-50 hover:opacity-100 transition-opacity"
                                >
                                    <EyeOff size={18} />
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    if (!newProductPass) {
                                        showToast(t("Password cannot be empty"), "error");
                                        return;
                                    }
                                    triggerConfirm("Change Password?", "Update the master application password?", false, () => { 
                                        updateSetting('productPassword', newProductPass); 
                                        setNewProductPass(''); 
                                        showToast(t("Password Updated Successfully!"), "success"); 
                                    });
                                }}
                                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Lock size={18} /> {t("Set New Password")}
                            </button>
                        </div>
                    </div>

                    {/* Auto Lock & Biometrics */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <Fingerprint size={20} className="text-blue-500" />
                            <h3 className="font-bold text-lg">{t("Device Security")}</h3>
                        </div>

                        <div className="space-y-3">
                            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-gray-50/50 border-gray-200'}`}>
                                <div className="flex items-center gap-3">
                                    <Clock size={18} className="text-blue-500" />
                                    <div>
                                        <p className="font-bold text-sm">{t("Auto Lock Timer")}</p>
                                        <p className="text-[11px] opacity-60">{t("Require password after inactivity")}</p>
                                    </div>
                                </div>
                                <select
                                    value={data.settings?.autoLockTime || '5'}
                                    onChange={e => updateSetting('autoLockTime', e.target.value)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold border outline-none focus:ring-2 focus:ring-blue-500/50 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                                >
                                    <option value="1">1 Min</option>
                                    <option value="5">5 Mins</option>
                                    <option value="15">15 Mins</option>
                                    <option value="30">30 Mins</option>
                                    <option value="never">Disabled</option>
                                </select>
                            </div>

                            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-gray-50/50 border-gray-200'}`}>
                                <div className="flex items-center gap-3">
                                    <Fingerprint size={18} className="text-purple-500" />
                                    <div>
                                        <p className="font-bold text-sm">{t("Biometric Unlock")}</p>
                                        <p className="text-[11px] opacity-60">{t("Use FaceID or Fingerprint")}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateSetting('biometricsEnabled', !data.settings?.biometricsEnabled)}
                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${data.settings?.biometricsEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${data.settings?.biometricsEnabled ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Protection Column */}
                <div className="space-y-6">
                    {/* Database & Backups */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <DatabaseBackup size={20} className="text-green-500" />
                            <h3 className="font-bold text-lg">{t("Data Integrity")}</h3>
                        </div>

                        <div className="space-y-3">
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'} relative overflow-hidden`}>
                                <div className="flex items-center justify-between z-10 relative">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md">
                                            <Lock size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{t("End-to-End Encryption")}</p>
                                            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70">{t("AES-256 Cloud Sync")}</p>
                                        </div>
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle size={14} /> {t("Active")}
                                    </span>
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-gray-50/50 border-gray-200'}`}>
                                <div className="flex items-center gap-3">
                                    <DatabaseBackup size={18} className="text-teal-500" />
                                    <div>
                                        <p className="font-bold text-sm">{t("Automated Backups")}</p>
                                        <p className="text-[11px] opacity-60">{t("Daily cloud snapshots")}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateSetting('autoBackup', !data.settings?.autoBackup)}
                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${data.settings?.autoBackup ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${data.settings?.autoBackup ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className={`p-5 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-sm ${isDark ? 'bg-red-950/10' : 'bg-red-50/30'}`}>
                        <div className="flex items-center gap-2 mb-4 text-red-500">
                            <AlertTriangle size={20} />
                            <h3 className="font-bold text-lg">Danger Zone</h3>
                        </div>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mb-4 font-medium">
                            {t("Proceed with caution. These actions can lead to permanent data loss if not used correctly.")}
                        </p>
                        <button
                            onClick={() => {
                                triggerConfirm("Revoke Sessions?", "Log out of all other devices currently logged into this account?", true, () => {
                                    showToast("Revoked sessions from 2 other devices.", "success");
                                });
                            }}
                            className="w-full py-3 px-4 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-between"
                        >
                            <span>{t("Revoke Other Sessions")}</span>
                            <KeyRound size={16} />
                        </button>
                    </div>

                </div>
            </div>
            
        </div>
    );
};

export default SecuritySettings;
