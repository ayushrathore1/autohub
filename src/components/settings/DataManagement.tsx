import React from 'react';
import { Database, Download, Upload, Trash2, FileJson, FileSpreadsheet, RefreshCw, HardDrive, Share2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { AppData } from '../../types';

interface DataManagementProps {
    isDark: boolean;
    t: (key: string) => string;
    data: AppData;
    pushToFirebase: (data: AppData) => void; setData?: (data: AppData) => void;
    triggerConfirm: (title: string, msg: string, isDanger: boolean, onConfirm: () => void) => void;
    showToast: (msg: string, type?: string) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({
    isDark, t, data, pushToFirebase, triggerConfirm, showToast
}) => {

    const handleExportJSON = () => {
        try {
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `InventoryBackup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(t("Backup downloaded successfully"), "success");
        } catch (error) {
            showToast(t("Failed to export JSON backup"), "error");
        }
    };

    const handleExportCSV = () => {
        try {
            if (!data.entries || data.entries.length === 0) {
                showToast(t("No inventory data to export"), "error");
                return;
            }
            // Generate CSV
            const headers = ["ID", "Name", "Category", "Quantity", "Base Price", "Selling Price", "Location"];
            const rows = data.entries.map(item => [
                item.id || '',
                `"${(item.name || '').replace(/"/g, '""')}"`,
                item.category || '',
                item.quantity || 0,
                item.basePrice || 0,
                item.sellingPrice || 0,
                `"${(item.location || '').replace(/"/g, '""')}"`
            ].join(','));
            
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Inventory_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(t("CSV exported successfully"), "success");
        } catch (error) {
            showToast(t("Failed to export CSV"), "error");
        }
    };

    const handleClearData = (dataType: 'transactions' | 'inventory' | 'all') => {
        let confirmMsg = "";
        let newData = { ...data };

        if (dataType === 'transactions') {
            confirmMsg = "Clear all bills and sales history? This cannot be undone.";
            newData = { ...newData, bills: [], salesEvents: [] };
        } else if (dataType === 'inventory') {
            confirmMsg = "Wipe entire inventory catalog? You will lose all products and stock data.";
            newData = { ...newData, entries: [] };
        } else {
            confirmMsg = "FACTORY RESET: Wiping all data, inventory, bills, and settings. Are you absolutely sure?";
            newData = { entries: [], bills: [], settings: {}, salesEvents: [], pages: [], gpsReminders: [], appStatus: 'active' };
        }

        triggerConfirm("Confirm Deletion", t(confirmMsg), true, () => {
            pushToFirebase(newData);
            showToast(t("Data cleared successfully"), "success");
        });
    };

    const calculateStorage = () => {
        const str = JSON.stringify(data);
        const bytes = new TextEncoder().encode(str).length;
        const kb = bytes / 1024;
        if (kb > 1024) return `${(kb / 1024).toFixed(2)} MB`;
        return `${kb.toFixed(2)} KB`;
    };

    const storageUsed = calculateStorage();
    const mockStorageMax = '50 MB'; // Just a visual mock for the cloud plan
    const storagePercentage = Math.min((JSON.stringify(data).length / (50 * 1024 * 1024)) * 100, 100);

    return (
        <div className="space-y-6 animate-in fade-in duration-400 max-w-4xl mx-auto pb-24">
            
            {/* Header */}
            <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} relative overflow-hidden`}>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg shadow-teal-500/30">
                            <Database size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-2xl">{t("Data Management")}</h2>
                            <p className="opacity-70 text-sm">{t("Storage, Backups & Deletion")}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left/Main Column - Backups */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Storage Health */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <HardDrive size={20} className="text-blue-500" />
                            <h3 className="font-bold text-lg">{t("Storage Health")}</h3>
                        </div>
                        
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-gray-50/50 border-gray-200'}`}>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span>{storageUsed} {t("Used")}</span>
                                <span className="opacity-50">{mockStorageMax} {t("Available")}</span>
                            </div>
                            <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full" 
                                    style={{ width: `${Math.max(storagePercentage, 2)}%` }}
                                ></div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold opacity-70">
                                <span>• {data.entries?.length || 0} {t("Products")}</span>
                                <span>• {data.bills?.length || 0} {t("Invoices")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Export & Backups */}
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-5">
                            <Download size={20} className="text-teal-500" />
                            <h3 className="font-bold text-lg">{t("Export & Backup")}</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* JSON Full Backup */}
                            <button
                                onClick={handleExportJSON}
                                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 group
                                ${isDark ? 'bg-slate-700/30 border-slate-600 hover:bg-slate-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:shadow-md'}`}
                            >
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
                                    <FileJson size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-sm">{t("Full Backup (JSON)")}</p>
                                    <p className="text-[11px] opacity-60 mt-1">{t("Complete clone of your database")}</p>
                                </div>
                            </button>

                            {/* CSV Export */}
                            <button
                                onClick={handleExportCSV}
                                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 group
                                ${isDark ? 'bg-slate-700/30 border-slate-600 hover:bg-slate-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:shadow-md'}`}
                            >
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-500 group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-sm">{t("Inventory Export (CSV)")}</p>
                                    <p className="text-[11px] opacity-60 mt-1">{t("For Excel, Sheets, and analysis")}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Danger Zone */}
                <div className="space-y-6">
                    <div className={`p-5 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-sm ${isDark ? 'bg-red-950/10' : 'bg-red-50/30'} flex flex-col h-full`}>
                        <div className="flex items-center gap-2 mb-4 text-red-500">
                            <ShieldAlert size={20} />
                            <h3 className="font-bold text-lg">{t("Data Deletion")}</h3>
                        </div>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mb-6 font-medium leading-relaxed">
                            {t("Warning: These operations instantly wipe data across all connected devices. Make sure you have exported a backup first.")}
                        </p>
                        
                        <div className="space-y-3 mt-auto">
                            <button
                                onClick={() => handleClearData('transactions')}
                                className="w-full p-3 rounded-xl border border-red-200 dark:border-red-800/50 font-semibold text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-between"
                            >
                                <span>{t("Clear Billing History")}</span>
                                <RefreshCw size={16} />
                            </button>

                            <button
                                onClick={() => handleClearData('inventory')}
                                className="w-full p-3 rounded-xl border border-red-200 dark:border-red-800/50 font-semibold text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-between"
                            >
                                <span>{t("Wipe Inventory DB")}</span>
                                <Trash2 size={16} />
                            </button>

                            <button
                                onClick={() => handleClearData('all')}
                                className="w-full p-4 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <AlertTriangle size={18} /> {t("Factory Reset App")}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
            
        </div>
    );
};

export default DataManagement;

