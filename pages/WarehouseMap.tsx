import React, { useState } from 'react';

interface ShelveUnit {
  id: string;
  x: number;
  y: number;
  type: 'shelf' | 'pallet' | 'area';
  label: string;
}

const WarehouseMap: React.FC = () => {
  const [zoom, setZoom] = useState(1);
  const [shelves, setShelves] = useState<ShelveUnit[]>([
    { id: 'S1', x: 2, y: 2, type: 'shelf', label: 'DÃY A1' },
    { id: 'S2', x: 4, y: 2, type: 'shelf', label: 'DÃY A2' },
    { id: 'S3', x: 6, y: 2, type: 'shelf', label: 'DÃY A3' },
    { id: 'S4', x: 2, y: 6, type: 'shelf', label: 'DÃY B1' },
    { id: 'S5', x: 4, y: 6, type: 'shelf', label: 'DÃY B2' },
  ]);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2));
  };

  return (
    <div className="p-8 h-[calc(100vh-100px)] flex flex-col space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">SƠ ĐỒ KHO THỰC TẾ (LAYOUT)</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Gióng vị trí kệ hàng trực quan theo mặt bằng grid</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
           <button 
             onClick={() => handleZoom(-0.1)}
             className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center font-black"
           >
             <span className="material-icons-round">zoom_out</span>
           </button>
           <span className="text-xs font-black text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
           <button 
             onClick={() => handleZoom(0.1)}
             className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center font-black"
           >
             <span className="material-icons-round">zoom_in</span>
           </button>
        </div>
      </header>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Toolbox */}
        <div className="w-64 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col gap-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hệ thống kệ / pallet</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center gap-3 cursor-move hover:border-primary hover:bg-white transition-all group">
               <div className="w-12 h-16 bg-primary rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center text-white">
                  <span className="material-icons-round">view_week</span>
               </div>
               <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-primary">Kệ đơn (Shelf)</span>
            </div>
            
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center gap-3 cursor-move hover:border-primary hover:bg-white transition-all group">
               <div className="w-16 h-12 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20 flex items-center justify-center text-white">
                  <span className="material-icons-round">grid_view</span>
               </div>
               <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-primary">Pallet Area</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center gap-3 cursor-move hover:border-primary hover:bg-white transition-all group">
               <div className="w-16 h-10 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white">
                  <span className="material-icons-round">door_front</span>
               </div>
               <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-primary">Khu vực Cửa</span>
            </div>
          </div>
          <div className="mt-auto p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-[9px] font-black text-primary uppercase leading-relaxed">Mẹo: Kéo kệ từ bảng này thả vào mặt bằng lưới bên phải để thiết lập Layout</p>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-slate-200 rounded-[2.5rem] border-4 border-white shadow-2xl relative overflow-hidden group">
           {/* Grid Background */}
           <div 
             className="absolute inset-0 pointer-events-none transition-transform duration-300" 
             style={{ 
               transform: `scale(${zoom})`,
               backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
               backgroundSize: '40px 40px' 
             }}
           ></div>

           {/* Layout Container */}
           <div 
             className="absolute inset-0 transition-transform duration-300"
             style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
           >
              {shelves.map((s) => (
                <div 
                  key={s.id}
                  className="absolute p-px cursor-pointer group/unit"
                  style={{ 
                    left: `${s.x * 40}px`, 
                    top: `${s.y * 40}px`,
                    width: '80px',
                    height: '160px'
                  }}
                >
                  <div className="w-full h-full bg-white rounded-xl shadow-2xl border-4 border-white ring-1 ring-slate-100 flex flex-col items-center justify-center gap-2 group-hover/unit:ring-primary transition-all">
                     <div className="w-10 h-2 bg-slate-100 rounded-full"></div>
                     <div className="flex gap-1">
                        <div className="w-4 h-20 bg-slate-100 rounded"></div>
                        <div className="w-4 h-20 bg-slate-100 rounded"></div>
                     </div>
                     <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded opacity-0 group-hover/unit:opacity-100 transition-opacity uppercase tracking-tighter">
                        {s.label}
                     </span>
                  </div>
                </div>
              ))}
           </div>

           {/* Floating Info */}
           <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
              <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-white/20 shadow-xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Đang ở chế độ chỉnh sửa thiết kế</span>
              </div>
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all pointer-events-auto active:scale-95">LƯU THAY ĐỔI LAYOUT</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseMap;
