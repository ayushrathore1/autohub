import React, { useState, useEffect } from 'react';
import { Store, User as UserIcon, Copy, Package, ShieldCheck, Download, ChevronRight, Save, AlertCircle, FileText, Hash, Receipt, MapPin, IndianRupee, Map } from 'lucide-react';
import { AppData, User } from '../../types';
import { ProfileSchema } from '../../schemas';

interface ProfileSettingsProps {
    isDark: boolean;
    t: (key: string) => string;
    data: AppData;
    user: User;
    pushToFirebase: (data: AppData) => void;
    showToast: (msg: string, type?: string) => void;
    setView: (view: string) => void;
    setPreviousView: (view: string) => void;
    deferredPrompt: any;
    setDeferredPrompt: (prompt: any) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    isDark, t, data, user, pushToFirebase, showToast, setView, setPreviousView, deferredPrompt, setDeferredPrompt
}) => {
    // Local state for form handling
    const [shopDetails, setShopDetails] = useState(data.settings || {});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDirty, setIsDirty] = useState(false);

    // Sync local state when external data changes (only if not dirty/editing)
    useEffect(() => {
        if (!isDirty && data.settings) {
            setShopDetails(data.settings);
        }
    }, [data.settings, isDirty]);

    const handleChange = (field: string, value: any) => {
        setShopDetails(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSave = () => {
        // Validate
        const validationResult = ProfileSchema.safeParse(shopDetails);
        
        if (!validationResult.success) {
            const emptyErrors: Record<string, string> = {};
            validationResult.error.issues.forEach(err => {
                if (err.path.length > 0) {
                     emptyErrors[err.path[0].toString()] = err.message;
                }
            });
            setErrors(emptyErrors);
            showToast(t("Please fix the errors in the form"), "error");
            return;
        }

        // Save
        pushToFirebase({ ...data, settings: shopDetails });
        setIsDirty(false);
        setErrors({});
        showToast(t("Profile updated successfully"), "success");
    };

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        showToast(`${label} ${t("copied")}`);
    };

    const appActions = [
        { id: 'inventory', icon: Package, label: 'Inventory Hub', view: 'items', color: 'text-blue-500' },
        { id: 'warranties', icon: ShieldCheck, label: 'Warranty Hub', view: 'warranties', color: 'text-emerald-500' },
    ];

    const handleAppAction = (viewName: string) => {
        setPreviousView('settings');
        setView(viewName);
    };

    const handleInstallApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                showToast(t("App installed successfully"), "success");
            } else {
                showToast(t("App installation cancelled"));
            }
        }
    };

    // Helper functions for conditionally styling inputs
    const getInputClassName = (errorKey: string, extraClasses = '') => `
        w-full p-4 rounded-2xl border-2 transition-all font-semibold outline-none
        ${errors[errorKey] ? 'border-red-500 bg-red-50/10 focus:border-red-500 focus:bg-red-50/20' : 
        (isDark ? 'bg-slate-900/50 border-slate-700/50 focus:border-purple-500 focus:bg-slate-800' : 
                  'bg-gray-50/50 border-gray-200 focus:border-purple-500 focus:bg-white')}
        ${extraClasses}
    `;

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-300 max-w-4xl mx-auto">
            
            {/* Header / ID Section */}
            <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700/50 shadow-slate-900/50' : 'bg-white border-gray-100 shadow-gray-200/50'} relative overflow-hidden`}>
                 {/* Decorative background element */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-10 -mt-10 blur-xl"></div>
                 
                 <div className="flex items-start gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/30">
                        <Store size={32} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-2xl truncate">{shopDetails.shopName || t("Store Name")}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md truncate opacity-70">
                                {user?.uid || 'user_id'}
                            </span>
                            <button onClick={() => copyToClipboard(user?.uid || '', 'User ID')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors opacity-50 hover:opacity-100">
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>
                 </div>
            </div>

            {/* Quick Actions (Dashboard Linkages) */}
            <div className="grid grid-cols-2 gap-3">
                {appActions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => handleAppAction(action.view)}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all group
                        ${isDark ? 'bg-slate-800 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600' : 
                                  'bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-opacity-10 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                <action.icon size={20} className={action.color} />
                            </div>
                            <span className="font-semibold text-sm">{t(action.label)}</span>
                        </div>
                        <ChevronRight size={16} className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                ))}
            </div>

            {/* Installation Prompt (if available) */}
            {deferredPrompt && (
                <div className={`p-5 rounded-2xl border bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 text-white rounded-xl shadow-md">
                            <Download size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold">{t("Install App")}</h4>
                            <p className="text-xs opacity-70">{t("Add to home screen for faster access and offline mode.")}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleInstallApp}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors w-full sm:w-auto focus:ring-4 focus:ring-blue-500/30"
                    >
                        {t("Install")}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Store Information Form */}
                <div className={`p-5 md:p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-gray-100'}`}>
                    <h3 className="font-bold flex items-center gap-2 mb-6">
                        <UserIcon size={20} className="text-indigo-500" /> 
                        {t("Store Profile")}
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold opacity-70 mb-1.5 block ml-1">{t("Store Name")} *</label>
                            <input
                                type="text"
                                value={shopDetails.shopName || ''}
                                onChange={(e) => handleChange('shopName', e.target.value)}
                                className={getInputClassName('shopName', 'text-lg')}
                                placeholder={t("e.g. Raj Auto Accessories")}
                            />
                            {errors.shopName && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 ml-1"><AlertCircle size={10} />{t(errors.shopName)}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-bold opacity-70 mb-1.5 block ml-1">{t("Phone Number")} *</label>
                            <input
                                type="tel"
                                value={shopDetails.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className={getInputClassName('phone')}
                                placeholder={t("e.g. 9876543210")}
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 ml-1"><AlertCircle size={10} />{t(errors.phone)}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-bold opacity-70 mb-1.5 block ml-1">{t("Email Address")}</label>
                            <input
                                type="email"
                                value={shopDetails.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className={getInputClassName('email')}
                                placeholder={t("e.g. contact@store.com")}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 ml-1"><AlertCircle size={10} />{t(errors.email)}</p>}
                        </div>
                    </div>
                </div>

                {/* Business & Invoice Configuration */}
                <div className={`p-5 md:p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-gray-100'}`}>
                    <h3 className="font-bold flex items-center gap-2 mb-6">
                        <Receipt size={20} className="text-orange-500" /> 
                        {t("Billing Identity")}
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold opacity-70 mb-1.5 block ml-1 flex items-center gap-1"><Hash size={12}/>{t("GSTIN / Tax ID")}</label>
                            <input
                                type="text"
                                value={shopDetails.gstNumber || ''}
                                onChange={(e) => handleChange('gstNumber', e.target.value.toUpperCase())}
                                className={getInputClassName('gstNumber', 'font-mono uppercase tracking-wider')}
                                placeholder="e.g. 29GGGGG1314R9Z6"
                            />
                            {errors.gstNumber && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 ml-1"><AlertCircle size={10} />{t(errors.gstNumber)}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-bold opacity-70 mb-1.5 block ml-1 flex items-center gap-1"><MapPin size={12}/>{t("Business Address")}</label>
                            <textarea
                                rows={2}
                                value={shopDetails.businessAddress || ''}
                                onChange={(e) => handleChange('businessAddress', e.target.value)}
                                className={getInputClassName('businessAddress', 'resize-none leading-relaxed')}
                                placeholder="104 Main Street, Auto Market..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold opacity-70 mb-1.5 block ml-1">{t("Invoice Prefix")}</label>
                                <input
                                    type="text"
                                    value={shopDetails.invoicePrefix || 'INV'}
                                    onChange={(e) => handleChange('invoicePrefix', e.target.value.toUpperCase())}
                                    className={getInputClassName('invoicePrefix', 'uppercase font-bold')}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold opacity-70 mb-1.5 block ml-1">{t("Default GST %")}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={shopDetails.defaultGST || '18'}
                                        onChange={(e) => handleChange('defaultGST', e.target.value)}
                                        className={getInputClassName('defaultGST')}
                                    />
                                    <span className="absolute right-4 top-4 font-bold opacity-50">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Bank Config (Toggle + Fields) */}
                        <div className={`mt-6 p-4 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-gray-200 bg-gray-50/50'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold flex items-center gap-2"><IndianRupee size={16} className="text-green-500"/>{t("Show Bank on Invoice")}</span>
                                <button
                                    onClick={() => handleChange('showBankOnInvoice', !shopDetails.showBankOnInvoice)}
                                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${shopDetails.showBankOnInvoice ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${shopDetails.showBankOnInvoice ? 'left-5' : 'left-0.5'}`}></div>
                                </button>
                            </div>
                            
                            {shopDetails.showBankOnInvoice && (
                                <div className="space-y-3 mt-4 animate-in slide-in-from-top-2 duration-200">
                                     <input
                                        type="text"
                                        value={shopDetails.bankAccountName || ''}
                                        onChange={(e) => handleChange('bankAccountName', e.target.value)}
                                        className={getInputClassName('bankAccountName', 'py-3 text-sm')}
                                        placeholder="Account Holder Name"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={shopDetails.bankAccountNumber || ''}
                                            onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                                            className={getInputClassName('bankAccountNumber', 'py-3 text-sm font-mono')}
                                            placeholder="A/C Number"
                                        />
                                        <input
                                            type="text"
                                            value={shopDetails.bankIFSC || ''}
                                            onChange={(e) => handleChange('bankIFSC', e.target.value.toUpperCase())}
                                            className={getInputClassName('bankIFSC', 'py-3 text-sm font-mono uppercase')}
                                            placeholder="IFSC Code"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all
                    ${isDirty 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0' 
                        : 'bg-gray-200 text-gray-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'}`}
                >
                    <Save size={20} />
                    {t("Save Changes")}
                </button>
            </div>
            
        </div>
    );
};

export default ProfileSettings;
