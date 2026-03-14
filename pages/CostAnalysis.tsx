import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'Tháng 4', actual: 1200000000, estimate: 1100000000 },
  { name: 'Tháng 5', actual: 1300000000, estimate: 1250000000 },
  { name: 'Tháng 6', actual: 1100000000, estimate: 1150000000 },
  { name: 'Tháng 7', actual: 1400000000, estimate: 1300000000 },
  { name: 'Tháng 8', actual: 1350000000, estimate: 1350000000 },
  { name: 'Hiện tại', actual: 1420000000, estimate: 1400000000 },
];

const CostAnalysis: React.FC = () => {
  return (
    <div className="p-6 lg:p-10 space-y-8">
      <header className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-accent">Chi phí Vận hành Kho</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Phân tích dữ liệu chi tiêu Kho Hàng Sài Gòn • Cập nhật: 15:40 Hôm nay</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-border-light rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-slate-300 shadow-sm transition-all">
            <span className="material-icons-round text-slate-400 text-sm">calendar_today</span>
            <span className="text-sm font-bold text-slate-700">Q3, 2023 (Tháng 7 - Tháng 9)</span>
          </div>
          <button className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
            <span className="material-icons-round text-sm">download</span>
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Tổng chi phí (VND)', value: '1.428.500.000', icon: 'account_balance_wallet', trend: 4.2, trendUp: true, sub: 'So với tháng trước' },
          { title: 'Sử dụng ngân sách', value: '82.4%', icon: 'pie_chart', progress: 82.4 },
          { title: 'Chi phí nhân công', value: '785.000.000', icon: 'engineering', trend: 1.8, trendUp: true, sub: 'Do tăng ca' },
          { title: 'Chi phí vật tư', value: '243.500.000', icon: 'bolt', trend: 0.5, trendUp: false, sub: 'Tối ưu điện năng' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-border-light p-6 rounded-2xl relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span className="material-icons-round text-6xl text-primary">{item.icon}</span>
             </div>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">{item.title}</p>
             <h3 className="text-2xl font-extrabold text-navy-accent mb-2">{item.value}</h3>
             {item.progress ? (
               <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                 <div className="bg-primary h-full rounded-full shadow-sm" style={{width: `${item.progress}%`}}></div>
               </div>
             ) : (
               <div className="flex items-center gap-2">
                 <span className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${item.trendUp ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                   <span className="material-icons-round text-xs">{item.trendUp ? 'trending_up' : 'trending_down'}</span> {item.trend}%
                 </span>
                 <span className="text-slate-400 text-[11px] font-medium">{item.sub}</span>
               </div>
             )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white border border-border-light p-6 rounded-2xl shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-extrabold text-navy-accent">So sánh Chi phí Hàng tháng</h4>
                <p className="text-slate-500 text-sm font-medium">Biểu đồ so sánh chi phí thực tế 6 tháng gần nhất</p>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-1.5">
                   <span className="w-3 h-3 bg-primary rounded-full"></span>
                   <span className="text-[10px] text-slate-500 font-bold uppercase">Thực tế</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <span className="w-3 h-3 bg-slate-200 rounded-full"></span>
                   <span className="text-[10px] text-slate-500 font-bold uppercase">Dự toán</span>
                 </div>
              </div>
           </div>
           <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barGap={0}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="estimate" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="actual" fill="#1d6ac9" radius={[4, 4, 0, 0]} barSize={20} >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Hiện tại' ? '#1d6ac9' : 'rgba(29, 106, 201, 0.4)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Donut Distribution */}
        <div className="bg-white border border-border-light p-6 rounded-2xl flex flex-col shadow-sm">
          <h4 className="text-xl font-extrabold text-navy-accent mb-1">Phân bổ Chi phí</h4>
          <p className="text-slate-500 text-sm mb-8 font-medium">Tỷ trọng các hạng mục chi tiêu</p>
          <div className="flex-1 flex items-center justify-center relative mb-8">
             <div className="relative w-48 h-48 rounded-full border-[16px] border-slate-50 flex items-center justify-center">
                {/* Simulated Donut Chart using SVG for precise look */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                   <circle cx="50" cy="50" fill="transparent" r="40" stroke="#1d6ac9" strokeWidth="8" strokeDasharray="175 251" strokeLinecap="round"></circle> 
                   <circle cx="50" cy="50" fill="transparent" r="40" stroke="#3b82f6" strokeWidth="8" strokeDasharray="75 251" strokeDashoffset="-180" strokeLinecap="round"></circle>
                   <circle cx="50" cy="50" fill="transparent" r="40" stroke="#0f172a" strokeWidth="8" strokeDasharray="40 251" strokeDashoffset="-260" strokeLinecap="round"></circle>
                </svg>
                <div className="text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng cộng</p>
                   <p className="text-2xl font-extrabold text-navy-accent">100%</p>
                </div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nhân công', val: '55%', color: 'bg-primary' },
              { label: 'Thuê kho', val: '28%', color: 'bg-blue-500' },
              { label: 'Khác', val: '17%', color: 'bg-navy-accent' },
            ].map((i, idx) => (
              <div key={idx} className="flex flex-col p-2 bg-slate-50 rounded-lg">
                 <div className="flex items-center gap-1.5 mb-1">
                   <span className={`w-2 h-2 rounded-full ${i.color}`}></span>
                   <span className="text-[10px] font-bold text-slate-600 uppercase">{i.label}</span>
                 </div>
                 <span className="text-sm font-extrabold text-navy-accent">{i.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysis;