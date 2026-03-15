import React, { useState } from 'react';
import { ArrowLeft, TrendingUp, ShoppingBag, Package, BarChart3, Users, DollarSign } from 'lucide-react';

export const AnalyticsDashboard: React.FC<{ isDark: boolean; t: (key: string) => string; onBack: () => void }> = ({ isDark, t, onBack }) => {
  const [timeRange, setTimeRange] = useState('Today');

  const stats = [
    { title: 'Total Sales', value: '\u20B945,200', change: '+12%', isPositive: true, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { title: 'Purchases', value: '\u20B928,500', change: '-5%', isPositive: false, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: 'Low Stock Items', value: '24', change: 'Needs attention', isPositive: false, icon: Package, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { title: 'Active Udhaar', value: '\u20B912,450', change: 'Across 8 customers', isPositive: false, icon: Users, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { title: 'Supplier Payment', value: '\u20B98,000', change: 'Due this week', isPositive: false, icon: DollarSign, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' }
  ];

  return (
    <div className={`p-4 h-full flex flex-col ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 transition-colors shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="text-blue-500" /> {t('Analytics')}
          </h2>
        </div>
        <select 
            className={`p-2 rounded-lg font-medium outline-none border shadow-sm transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
        >
          {['Today', 'This Week', 'This Month', 'This Year'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.slice(0, 2).map((stat, i) => (
          <div key={i} className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon size={20} />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{stat.title}</p>
            <p className="text-2xl font-black mt-1 tracking-tight">{stat.value}</p>
            <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${stat.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change.includes('%') && <TrendingUp size={12} className={stat.isPositive ? '' : 'rotate-180'}/>} {stat.change}
            </p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-purple-500"/> Business Overview</h3>
      
      <div className="space-y-3 overflow-y-auto pb-20 flex-1 hide-scrollbar">
          {stats.slice(2).map((stat, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-gray-200'} relative overflow-hidden`} >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${stat.bg.split(' ')[0]}`}/>
                  <div className={`p-3 rounded-full ${stat.bg} ${stat.color} shadow-sm`}>
                      <stat.icon size={22} />
                  </div>
                  <div className="flex-1">
                      <p className="font-bold text-gray-800 dark:text-gray-200">{stat.title}</p>
                      <p className="text-sm text-gray-500 font-medium mt-0.5">{stat.change}</p>
                  </div>
                  <div className="text-right">
                      <p className={`text-xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                  </div>
              </div>
          ))}

          <div className={`mt-4 p-6 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center py-10 opacity-70 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-3">
                  <BarChart3 size={28}/>
              </div>
              <h4 className="font-bold text-lg mb-1">Detailed Reports Coming Soon</h4>
              <p className="text-sm text-gray-500 max-w-[200px]">Interactive charts for profit & loss, GST reports, and margin analysis.</p>
          </div>
      </div>
    </div>
  );
};
