import React, { useEffect, useState } from 'react';

const StaffCheckIn: React.FC<{onExit: () => void}> = ({onExit}) => {
  const [time, setTime] = useState(new Date());
  const [checkInTime] = useState(new Date(new Date().setHours(8, 0, 0))); // Giả lập 8h sáng hôm nay
  const [elapsed, setElapsed] = useState('');

  // Live Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setTime(now);
        
        // Calculate elapsed time since 8:00 AM
        const diff = now.getTime() - checkInTime.getTime();
        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [checkInTime]);

  const formatDate = (date: Date) => {
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const d = date.getDate();
      const m = date.getMonth() + 1;
      return `${days[date.getDay()]}, ${d} Tháng ${m}`;
  };

  return (
    <div className="bg-slate-200 text-slate-900 min-h-screen flex justify-center items-center font-sans">
      <main className="w-full max-w-[480px] h-screen bg-background-light relative flex flex-col shadow-2xl overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img className="w-full h-full object-cover brightness-110 contrast-[0.85] opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQ0DLcDOQZnvJ7R-n2T4CcAvnpeecGCJ7UdMBal46vdyZ8JdBHSP4Uh1bTTFowgeJLPofaIFUeDnZPMI0EWAehJLGPwAjWwjvtEiBB5y_L4RIIM74com26ZrZptVU-0Ucg6IbMxS2rKOE_ZCZJXQHkol04CWQFF7gNGgTUyybG1JKyry94UN4k5a7taA3XAR47Mp7MwyXgsOHegIfSukm-pvmZ8G-zBvSONlueWedmlKouvfnkAlPFIvVg6de_9EleJsHXQlUFWmal" alt="Background" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/40 to-background-light"></div>
        </div>

        <header className="relative z-10 p-6 flex justify-between items-center">
          <div 
             className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity active:scale-95 select-none" 
             onClick={onExit}
             role="button"
             tabIndex={0}
             title="Quay về trang chủ"
          >
             <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <span className="material-icons-round">warehouse</span>
             </div>
             <div>
                <h1 className="text-sm font-bold uppercase tracking-wider text-primary">Kho Hàng Sài Gòn</h1>
                <p className="text-[10px] text-slate-500 font-bold">Quay về Dashboard quản lý</p>
             </div>
          </div>
          <button onClick={onExit} className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
             <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD0YVBslEb3iO8RcKJ7oHEJBePXxkX33aCuA1THi1FPyaYpdeDVnn66vSEn7I99qTu0pVn9V7CefAyqG2KUjB-o7mTs-om4EdNhiYTFTiUbX-9kTtrtRETCZm032AE_Kzc4omY8sz6jwOxAygxAnVuJhxOj2VaLxLpeqTineq8QSgzXGoUc60rLBpU7yUzrI2GK9ICbOL2lyzvymkJQn46VfER-dRpIc-Tf-84p14pMG9DzpybJIWJlItN-j1Ndc26FjubsJFWQUKU" alt="User Avatar" />
          </button>
        </header>

        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-32 custom-scrollbar">
           <section className="mt-4 mb-8">
              <h2 className="text-2xl font-extrabold text-slate-800">Xin chào, Nguyễn Văn A</h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <p className="text-slate-600 text-sm font-semibold">Đang trong ca làm việc</p>
              </div>
           </section>
           
           <section className="bg-white shadow-lg shadow-slate-200/50 rounded-2xl p-6 mb-8 text-center border border-slate-100 transition-all hover:shadow-xl">
              <div className="mb-6">
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Thời gian hiện tại</p>
                 <div className="text-4xl font-extrabold tracking-tight text-slate-800 tabular-nums">
                     {time.toLocaleTimeString('vi-VN')}
                 </div>
                 <p className="text-primary font-bold mt-1">{formatDate(time)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl py-4 mb-6 border border-slate-100">
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Thời gian đã làm</p>
                 <div className="text-3xl font-bold text-slate-800 tabular-nums">{elapsed || '00:00:00'}</div>
              </div>
              <button className="w-full py-5 bg-red-500 hover:bg-red-600 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-red-500/30 text-white group">
                 <span className="material-icons-round text-2xl group-hover:rotate-180 transition-transform">logout</span>
                 <span className="text-lg font-bold tracking-wide">KẾT THÚC CA LÀM</span>
              </button>
           </section>

           <section className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white shadow-sm rounded-xl p-4">
                 <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Check-in</p>
                 <p className="text-lg font-bold text-slate-800">08:00 AM</p>
              </div>
              <div className="bg-white shadow-sm rounded-xl p-4 border-l-4 border-primary">
                 <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Dự kiến nghỉ</p>
                 <p className="text-lg font-bold text-slate-800">05:00 PM</p>
              </div>
           </section>

           <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Lịch sử tuần này</h3>
              <div className="space-y-3">
                 {[
                   { day: 'TH2', date: '23', time: '08:05 - 17:15', note: '8.5 giờ', status: 'Hợp lệ', color: 'emerald' },
                   { day: 'CN', date: '22', time: '08:00 - 12:00', note: 'Tăng ca', status: 'Xác nhận', color: 'primary' },
                   { day: 'TH7', date: '21', time: '07:55 - 17:00', note: '8.0 giờ', status: 'Hợp lệ', color: 'emerald' }
                 ].map((item, idx) => (
                   <div key={idx} className="bg-white/80 rounded-xl p-4 flex items-center justify-between border border-slate-50 shadow-sm hover:bg-white transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-400 leading-none">{item.day}</span>
                            <span className="text-sm font-extrabold text-slate-700 leading-none mt-1">{item.date}</span>
                         </div>
                         <div>
                            <p className="text-sm font-bold text-slate-800">{item.time}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{item.note}</p>
                         </div>
                      </div>
                      <div className={`text-${item.color === 'primary' ? 'blue' : 'emerald'}-600 text-xs font-bold bg-${item.color === 'primary' ? 'blue' : 'emerald'}-50 px-3 py-1.5 rounded-full`}>{item.status}</div>
                   </div>
                 ))}
              </div>
           </section>
        </div>

        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-slate-100 border-t border-slate-200 z-20 px-8 flex justify-between items-center">
           <button className="flex flex-col items-center text-primary group"><span className="material-icons-round group-hover:-translate-y-1 transition-transform">fingerprint</span><span className="text-[10px] font-bold mt-1">Chấm công</span></button>
           <button className="flex flex-col items-center text-slate-400 group hover:text-primary transition-colors"><span className="material-icons-round group-hover:-translate-y-1 transition-transform">receipt_long</span><span className="text-[10px] font-bold mt-1">Lương</span></button>
           <button className="flex flex-col items-center text-slate-400 group hover:text-primary transition-colors"><span className="material-icons-round group-hover:-translate-y-1 transition-transform">event_note</span><span className="text-[10px] font-bold mt-1">Nghỉ phép</span></button>
           <button className="flex flex-col items-center text-slate-400 group hover:text-primary transition-colors"><span className="material-icons-round group-hover:-translate-y-1 transition-transform">person_outline</span><span className="text-[10px] font-bold mt-1">Cá nhân</span></button>
        </nav>
        
        <div className="absolute bottom-24 right-6 z-30">
           <button className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/40 active:scale-90 transition-transform text-white hover:bg-blue-700">
              <span className="material-icons-round text-3xl">qr_code_scanner</span>
           </button>
        </div>
      </main>
    </div>
  );
};

export default StaffCheckIn;