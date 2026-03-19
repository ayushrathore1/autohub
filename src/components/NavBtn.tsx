
import React from 'react';
import { hexToRgba } from '../lib/ui-utils';

interface NavBtnProps {
    icon: any;
    label: string;
    active: boolean;
    onClick: () => void;
    alert?: boolean;
    alertCount?: number;
    isDark: boolean;
    accentHex: string;
}

const NavBtn: React.FC<NavBtnProps> = ({ icon, label, active, onClick, alert, alertCount, isDark, accentHex }) => (
    <button
        onClick={() => {
           if ('vibrate' in navigator) navigator.vibrate(40);
           onClick();
        }}
        className={`relative flex-1 flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-200 ${active
            ? isDark
                ? ''
                : 'shadow-sm'
            : isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
        style={active ? {
            color: accentHex,
            backgroundColor: isDark ? hexToRgba(accentHex, 0.16) : hexToRgba(accentHex, 0.14)
        } : undefined}
    >
        <div
            className="p-1.5 rounded-xl transition-all relative"
            style={active ? { backgroundColor: isDark ? hexToRgba(accentHex, 0.22) : hexToRgba(accentHex, 0.18) } : undefined}
        >
            {icon && React.createElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
            {alertCount && alertCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-sm shadow-red-500/50 border border-white dark:border-slate-900 z-10 animate-pulse">{alertCount > 9 ? '9+' : alertCount}</span>
            ) : alert ? (
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce border-2 border-white dark:border-slate-900" />
            ) : null}
        </div>
        <span className={`text-[9px] font-bold mt-0.5 text-center leading-none ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
);

export default NavBtn;
