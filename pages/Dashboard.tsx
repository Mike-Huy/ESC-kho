import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const data = [
  { name: 'Thứ 2', value: 80 },
  { name: 'Thứ 3', value: 100 },
  { name: 'Thứ 4', value: 120 },
  { name: 'Hôm nay', value: 142 },
  { name: 'Thứ 6', value: 90 },
  { name: 'Thứ 7', value: 110 },
  { name: 'CN', value: 50 },
];

const pieData = [
  { name: 'Đã giao', value: 65, color: '#10b981' },
  { name: 'Đang đóng gói', value: 25, color: '#1d6ac9' },
  { name: 'Chờ lấy', value: 8, color: '#f59e0b' },
  { name: 'Hoàn trả', value: 2, color: '#ef4444' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="pb-8">
      {/* Hero Section */}
      <section className="relative h-32 sm:h-40 md:h-48 flex items-start pt-4 sm:pt-6 overflow-hidden">
        <img
          className="absolute inset-0 w-full h-full object-cover brightness-105"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKRE4koEaAQkwOrYtvd3bCY_IqfikW_iVcr-Ht_6H8doccuN4-jh0kodvXOMAdA_Hmlrrbku2OBrbQyTkjW8flpDygDISDbncsHX_A-ko201IbZRK4m5Jd1J8sDkMo5tmmM8cAV6ewaRxGMGQYlKTlB7WBTZd0Zh-YmHmJJyCKNasLVHYA3Sfr7RMJroHjf1dV-81y-SyuGoiRDtWo0c1Zz86oo2ws2n-fe52dcs27bW0Zz8gPsKXu4NXyQUYc-kktD6ut0Hh4lunm"
          alt="Warehouse"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
        <div className="relative z-10 px-4 sm:px-6 md:px-8 w-full max-w-7xl">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mb-1 sm:mb-2">Dashboard Kho ESC</h1>
          <p className="text-xs sm:text-sm text-slate-600 font-bold leading-snug">
            Hôm nay ghi nhận <span className="font-extrabold text-red-800 px-0.5">142</span> đơn mới và <span className="font-extrabold text-red-800 px-0.5">12</span> lô đang trên đường đến.
          </p>
        </div>
      </section>

      <div className="p-3 sm:p-5 md:p-8 max-w-[1600px] mx-auto w-full space-y-4 sm:space-y-6 md:space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[
            { title: 'Tổng Đơn Hàng (Tuần)', value: '1,284', icon: 'receipt_long', color: 'primary', trend: '+12.5%', trendColor: 'emerald' },
            { title: 'Vận Chuyển Đang Chờ', value: '42', icon: 'pending_actions', color: 'warning', badge: 'Cần xử lý' },
            { title: 'Mức Tồn Kho Thấp', value: 'Hết hàng', icon: 'error_outline', color: 'danger', badge: '8 SKU' },
            { title: 'Công Suất Kho', value: '82%', icon: 'inventory', color: 'primary', progress: 82 }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-border-light p-3 sm:p-4 md:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color === 'primary' ? 'bg-blue-50 text-blue-600' : item.color === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                  <span className="material-icons-round text-lg sm:text-xl">{item.icon}</span>
                </div>
                {item.trend && <span className={`text-[10px] sm:text-xs font-bold text-${item.trendColor}-600 bg-${item.trendColor}-50 px-1.5 py-0.5 rounded`}>{item.trend}</span>}
                {item.badge && <span className={`text-[10px] sm:text-xs font-bold text-${item.color === 'warning' ? 'amber' : 'rose'}-600 bg-${item.color === 'warning' ? 'amber' : 'rose'}-50 px-1.5 py-0.5 rounded`}>{item.badge}</span>}
                {item.progress && <div className="w-12 sm:w-16 md:w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{width: `${item.progress}%`}}></div></div>}
              </div>
              <h3 className="text-slate-500 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide leading-tight">{item.title}</h3>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1 text-slate-900 leading-tight">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white border border-border-light rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-slate-900">Xu hướng Đơn hàng Hàng tuần</h3>
              <select className="bg-slate-50 border-border-light text-slate-600 text-xs font-bold rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 focus:ring-primary outline-none">
                <option>7 ngày qua</option>
                <option>30 ngày qua</option>
              </select>
            </div>
            <div className="h-48 sm:h-56 md:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Hôm nay' ? '#1d6ac9' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-white border border-border-light rounded-xl p-4 sm:p-5 md:p-6 shadow-sm flex flex-col items-center justify-center">
            <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2 text-slate-900 self-start">Trạng thái vận đơn</h3>
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 my-2 sm:my-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius="55%" outerRadius="75%" paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">285</span>
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-bold">Đang xử lý</span>
              </div>
            </div>
            <div className="w-full space-y-2 sm:space-y-3">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{backgroundColor: item.color}}></span>
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
