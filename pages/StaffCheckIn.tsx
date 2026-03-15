import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface StaffCheckInProps {
  onExit: () => void;
  user: any;
}

const StaffCheckIn: React.FC<StaffCheckInProps> = ({ onExit, user }) => {
  const [time, setTime] = useState(new Date());
  const [currentAttendance, setCurrentAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState('00:00:00');

  // Fetch today's attendance and history
  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // 1. Get today's record
      const { data: todayData, error: todayError } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .maybeSingle();

      if (todayError) throw todayError;
      setCurrentAttendance(todayData);

      // 2. Get recent history (past 7 days)
      const { data: historyData, error: historyError } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('work_date', { ascending: false })
        .limit(7);

      if (historyError) throw historyError;
      setHistory(historyData || []);

    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Live Clock and Elapsed Time logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);

      if (currentAttendance?.check_in && !currentAttendance?.check_out) {
        const checkInTime = new Date(currentAttendance.check_in);
        const diff = now.getTime() - checkInTime.getTime();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      } else {
        setElapsed('00:00:00');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentAttendance]);

  const handleAction = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];

      if (!currentAttendance) {
        // Perform Check-in
        const { error } = await supabase
          .from('hr_attendance')
          .insert({
            user_id: user.id,
            work_date: today,
            check_in: now,
            status: 'present',
            website_id: [APP_CONFIG.WEBSITE_ID]
          });
        if (error) throw error;
      } else if (!currentAttendance.check_out) {
        // Perform Check-out
        const { error } = await supabase
          .from('hr_attendance')
          .update({ check_out: now })
          .eq('id', currentAttendance.id);
        if (error) throw error;
      }
      
      await fetchData();
    } catch (err) {
      console.error('Action error:', err);
      alert('Đã xảy ra lỗi khi thực hiện thao tác.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[date.getDay()]}, ${date.getDate()} Tháng ${date.getMonth() + 1}`;
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate()
    };
  };

  if (!user) return null;

  return (
    <div className="bg-slate-200 text-slate-900 min-h-screen flex justify-center items-center font-sans">
      <main className="w-full max-w-[480px] h-screen bg-white relative flex flex-col shadow-2xl overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-5">
           <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(#1d6ac9 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
        </div>

        <header className="relative z-10 p-6 flex justify-between items-center border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onExit}>
             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
                <img src="/logo-kho-hang-sg.jpg" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <div>
                <h1 className="text-sm font-black uppercase text-primary tracking-tight">KHO SÀI GÒN</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">HỆ THỐNG WMS</p>
             </div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-slate-100 overflow-hidden shadow-sm bg-slate-50">
             <img 
               className="w-full h-full object-cover" 
               src={user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVzLvkJIdAaJAEd2-mZQ2Exovadg1pYx3BKGoMeVNkIUaI4hRmWdFDXX9VUlqPMwE9r-Xm4zpP9cAqP-wfts5jJOB5LPtA6l7d0W__i7xCJ2fJ40GhBnkiMg6LzBuBtruLnrV8xzyldIKZzpgkpjIAqP6PwlRyrMHKrbXKsXIb_31U66S9kGs-uHj6c8EEBXrNnnmkhICniJKNVAPl9oZIQqiNkera16ObwENxA1DXo1B1Gh1hPg3CwVUol05bFhuBjNmiBTjLK5WA'} 
               alt="Avatar" 
               onError={(e: any) => e.target.src = 'https://via.placeholder.com/100?text=User'}
             />
          </div>
        </header>

        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar">
           <section className="mt-8 mb-8">
              <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-2 block">Cổng nhân viên</span>
              <h2 className="text-3xl font-black text-slate-900 leading-none">Xin chào,<br/>{user.full_name}</h2>
              <div className="flex items-center gap-2 mt-3">
                 <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentAttendance?.check_in && !currentAttendance?.check_out ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                   {currentAttendance?.check_in && !currentAttendance?.check_out ? 'Đang trong ca làm việc' : 'Ngoài giờ làm việc'}
                 </p>
              </div>
           </section>
           
           <section className="bg-white shadow-2xl shadow-slate-200 rounded-[2.5rem] p-8 mb-8 text-center border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
              
              <div className="mb-8 relative z-10">
                 <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">Thời gian hiện tại</p>
                 <div className="text-5xl font-black tracking-tighter text-slate-900 tabular-nums mb-2">
                     {time.toLocaleTimeString('vi-VN', { hour12: false })}
                 </div>
                 <p className="text-primary font-black text-xs uppercase tracking-widest">{formatDate(time)}</p>
              </div>

              <div className="bg-slate-50 rounded-3xl py-6 mb-8 border border-slate-100 relative z-10">
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Thời gian làm việc hôm nay</p>
                 <div className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">{elapsed}</div>
              </div>

              <button 
                onClick={handleAction}
                disabled={loading || (currentAttendance?.check_in && currentAttendance?.check_out)}
                className={`w-full py-6 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 text-white font-black tracking-widest relative z-10 
                  ${!currentAttendance 
                    ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' 
                    : !currentAttendance.check_out 
                      ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'
                      : 'bg-slate-300 cursor-not-allowed'}`}
              >
                 <span className="material-icons-round text-2xl">
                   {!currentAttendance ? 'login' : !currentAttendance.check_out ? 'logout' : 'check_circle'}
                 </span>
                 <span className="text-lg uppercase">
                    {!currentAttendance ? 'Bắt đầu ca làm' : !currentAttendance.check_out ? 'Kết thúc ca làm' : 'Đã hoàn thành'}
                 </span>
              </button>
           </section>

           <section className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white shadow-sm rounded-3xl p-5 border border-slate-100">
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2"> Giờ vào</p>
                 <p className="text-xl font-black text-slate-900">
                   {currentAttendance?.check_in ? new Date(currentAttendance.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                 </p>
              </div>
              <div className="bg-white shadow-sm rounded-3xl p-5 border border-slate-100 border-l-4 border-primary">
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Giờ ra</p>
                 <p className="text-xl font-black text-slate-900">
                   {currentAttendance?.check_out ? new Date(currentAttendance.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                 </p>
              </div>
           </section>

           <section className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Lịch sử chấm công</h3>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">7 ngày gần nhất</span>
              </div>
              <div className="space-y-4">
                 {history.length > 0 ? history.map((item, idx) => {
                   const { dayName, dayNum } = formatShortDate(item.work_date);
                   const isDone = item.check_in && item.check_out;
                   return (
                    <div key={idx} className="bg-slate-50/50 rounded-3xl p-4 flex items-center justify-between border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center border border-slate-100 group-hover:border-primary transition-colors">
                             <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{dayName}</span>
                             <span className="text-xl font-black text-slate-800 leading-none mt-1.5">{dayNum}</span>
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-800">
                               {item.check_in ? new Date(item.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''} 
                               {item.check_out ? ` - ${new Date(item.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ' (Đang làm)'}
                             </p>
                             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">{item.status === 'present' ? 'Có mặt' : item.status}</p>
                          </div>
                       </div>
                       <div className={`w-3 h-3 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                    </div>
                   );
                 }) : (
                   <div className="text-center py-10 text-slate-300">
                      <span className="material-icons-round text-4xl mb-2">history_toggle_off</span>
                      <p className="text-xs font-bold uppercase">Chưa có lịch sử</p>
                   </div>
                 )}
              </div>
           </section>
        </div>

        {/* Floating Bottom Nav for Staff */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-100 z-20 px-6 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
           <button onClick={onExit} className="flex flex-col items-center text-slate-400 group hover:text-primary transition-colors">
              <span className="material-icons-round text-2xl">home</span>
              <span className="text-[9px] font-black uppercase mt-1 tracking-widest">Trang chủ</span>
           </button>
           <button className="flex flex-col items-center text-primary group">
              <span className="material-icons-round text-2xl">fingerprint</span>
              <span className="text-[9px] font-black uppercase mt-1 tracking-widest">Chấm công</span>
           </button>
           <button className="flex flex-col items-center text-slate-300 group hover:text-primary transition-colors">
              <span className="material-icons-round text-2xl">receipt_long</span>
              <span className="text-[9px] font-black uppercase mt-1 tracking-widest">Lương</span>
           </button>
           <button className="flex flex-col items-center text-slate-300 group hover:text-primary transition-colors">
              <span className="material-icons-round text-2xl">event_note</span>
              <span className="text-[9px] font-black uppercase mt-1 tracking-widest">Nghỉ phép</span>
           </button>
           <button className="flex flex-col items-center text-slate-300 group hover:text-primary transition-colors">
              <span className="material-icons-round text-2xl">person_outline</span>
              <span className="text-[9px] font-black uppercase mt-1 tracking-widest">Cá nhân</span>
           </button>
        </nav>
      </main>
    </div>
  );
};

export default StaffCheckIn;