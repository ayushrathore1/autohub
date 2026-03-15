import React from 'react';
import { CreditCard, Share2, Phone, Store, ArrowLeft } from 'lucide-react';

interface DigitalBusinessCardProps {
    shopDetails: any;
    isDark?: boolean;
    t?: (key: string) => string;
    onBack?: () => void;
}

const DigitalBusinessCard: React.FC<DigitalBusinessCardProps> = ({ shopDetails, isDark = false, t = (k) => k, onBack }) => {
    // Native App Styles
    const cardClass = `h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`;

    return (
        <div className={cardClass}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                            <ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />
                        </button>
                    )}
                    <h3 className="font-bold text-xl flex items-center gap-2">
                        <CreditCard className="text-orange-500" size={24} />
                        {t('Digital Business Card')}
                    </h3>
                </div>
                <button onClick={() => alert('Sharing not available in preview')} className="p-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full hover:shadow-lg shadow-md transition-all">
                    <Share2 size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
                <div id="biz-card" className="w-full max-w-sm mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white p-6 rounded-3xl shadow-2xl aspect-[1.7/1] relative overflow-hidden mb-8 border border-slate-700">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <h2 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">{shopDetails.shopName || "My Business"}</h2>
                            <p className="text-orange-400 font-medium tracking-wide text-sm">{shopDetails.ownerName || "Business Owner"}</p>
                        </div>
                        <div className="space-y-3 mt-4 text-sm font-medium text-gray-200">
                            <p className="flex items-center gap-3"><Phone size={16} className="text-orange-400" /> {shopDetails.mobile || "+91 98765 43210"}</p>
                            <p className="flex items-center gap-3"><Store size={16} className="text-orange-400" /> {shopDetails.address || "Business Address"}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-500/20 max-w-sm w-full text-center">
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                        This is a live preview of your digital business card. Share it with customers to expand your reach.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DigitalBusinessCard;
