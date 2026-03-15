import React, { useState } from 'react';

const InternalProcess: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'debundle' | 'combo'>('debundle');

  return (
    <div className="p-8 lg:p-12 space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      <header>
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100 uppercase font-black text-xs">
              <span className="material-icons-round">sync_alt</span>
           </div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight text-uppercase">XỬ LÝ NỘI BỘ (INTERNAL)</h1>
        </div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest pl-1">Chuyển đổi quy cách sản phẩm, đóng gói combo và rã hàng</p>
      </header>

      <div className="flex gap-4 p-1.5 bg-slate-100 rounded-2xl w-fit">
         <button 
           onClick={() => setActiveTab('debundle')}
           className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'debundle' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
         >
           Rã hàng (Thùng thành Lon)
         </button>
         <button 
           onClick={() => setActiveTab('combo')}
           className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'combo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
         >
           Đóng gói COMBO
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8">
              {activeTab === 'debundle' ? (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sản phẩm Nguồn (Thành phẩm)</h3>
                         <div className="relative">
                            <span className="material-icons-round absolute left-4 top-4 text-slate-300">search</span>
                            <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-indigo-300 transition-all font-bold text-sm" placeholder="Chọn sản phẩm thùng cần rã..." />
                         </div>
                         <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center py-12 opacity-40">
                            <span className="material-icons-round text-4xl mb-2">unarchive</span>
                            <p className="font-black uppercase tracking-widest text-[10px]">Chưa chọn sản phẩm</p>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sản phẩm Đích (Lẻ)</h3>
                         <div className="relative">
                            <span className="material-icons-round absolute left-4 top-4 text-slate-300">auto_awesome</span>
                            <input disabled className="w-full bg-slate-100 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 outline-none font-bold text-sm" placeholder="Tự động khớp sản phẩm con..." />
                         </div>
                         <div className="p-6 bg-slate-50 rounded-3xl">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quy đổi mặc định</span>
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-black">1 Thùng = 24 Lon</span>
                             </div>
                             <div className="h-20 flex flex-col items-center justify-center border-t border-slate-100 pt-4">
                                <p className="text-slate-300 font-bold italic text-sm text-center">Vui lòng chọn sản phẩm nguồn để xem danh sách thu hồi</p>
                             </div>
                         </div>
                      </div>
                   </div>
                   <div className="pt-8 border-t border-slate-50 flex justify-end">
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95">
                         XÁC NHẬN RÃ HÀNG
                      </button>
                   </div>
                </div>
              ) : (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sản phẩm chính</h3>
                         <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:bg-white focus:border-indigo-300 transition-all font-bold text-sm" placeholder="Tìm sản phẩm Combo..." />
                      </div>
                      <div className="space-y-6 text-center lg:text-right">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Số bộ Combo cần đóng</h3>
                         <input className="w-40 bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none text-center font-black text-2xl" defaultValue="1" type="number" />
                      </div>
                   </div>
                   <div className="pt-8 border-t border-slate-50 flex justify-center py-20 opacity-30">
                      <div className="flex flex-col items-center gap-4">
                        <span className="material-icons-round text-6xl">category</span>
                        <p className="font-black uppercase tracking-widest">Tính năng đang được chuẩn bị dữ liệu</p>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default InternalProcess;
