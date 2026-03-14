import React, { useState } from 'react';

interface ShelfUnitProps {
  id?: string;
  status: 'green' | 'yellow' | 'red';
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const ShelfUnit: React.FC<ShelfUnitProps> = ({ id, status, isSelected, onSelect }) => {
  const colorClasses = {
    green: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700/20',
    yellow: 'bg-amber-400 hover:bg-amber-500 border-amber-600/20',
    red: 'bg-rose-500 hover:bg-rose-600 border-rose-700/20'
  };

  return (
    <div 
      className={`h-10 border-2 rounded transition-all cursor-pointer group relative ${colorClasses[status]} ${isSelected ? 'ring-2 ring-primary shadow-lg shadow-primary/20 scale-105 z-10' : ''}`}
      onClick={() => id && onSelect && onSelect(id)}
    >
      {id && (
        <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white ${!isSelected ? 'opacity-0 group-hover:opacity-100' : ''}`}>
          {id}
        </span>
      )}
    </div>
  );
};

const RackMap: React.FC = () => {
  const [selectedBin, setSelectedBin] = useState<string | null>('B-204');

  return (
    <div className="flex h-full relative">
       {/* Main Map Area */}
       <div className="flex-1 overflow-auto custom-scrollbar p-12 warehouse-grid relative bg-white h-[calc(100vh-64px)]">
         {/* Map Controls */}
         <div className="fixed bottom-8 left-72 z-30 flex flex-col bg-white border border-border-light rounded-lg shadow-xl overflow-hidden">
            <button className="p-2 hover:bg-slate-50 text-slate-600 border-b border-border-light"><span className="material-icons-round">add</span></button>
            <button className="p-2 hover:bg-slate-50 text-slate-600 border-b border-border-light"><span className="material-icons-round">remove</span></button>
            <button className="p-2 hover:bg-slate-50 text-slate-600"><span className="material-icons-round">filter_center_focus</span></button>
         </div>

         {/* Legend */}
         <div className="fixed top-24 left-72 z-30 bg-white/90 backdrop-blur-sm border border-border-light p-4 rounded-xl shadow-lg space-y-3">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trạng thái kệ</h4>
           {[
             { color: 'bg-emerald-500', label: 'Trống/Sẵn sàng' },
             { color: 'bg-amber-400', label: 'Đang lưu trữ (<80%)' },
             { color: 'bg-rose-500', label: 'Đầy/Bão hòa' }
           ].map((l, i) => (
             <div key={i} className="flex items-center gap-3">
               <span className={`w-3 h-3 rounded ${l.color}`}></span>
               <span className="text-xs font-medium text-slate-700">{l.label}</span>
             </div>
           ))}
         </div>

         {/* The Grid Map Container */}
         <div className="relative border-4 border-slate-200 rounded-lg bg-slate-50/50 min-w-[1000px] h-[800px] shadow-inner mx-auto">
            {/* Doors */}
            <div className="absolute bottom-0 left-1/4 right-1/4 h-12 bg-slate-200 flex justify-around items-center rounded-t-lg">
              {['Cửa Nhập 01', 'Cửa Nhập 02', 'Khu vực Xuất'].map((d, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="material-icons-round text-slate-400 text-lg">{i === 2 ? 'local_shipping' : 'door_sliding'}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{d}</span>
                </div>
              ))}
            </div>

            {/* Racks */}
            <div className="p-16 grid grid-cols-4 gap-20">
               {['A', 'B', 'C', 'D'].map((row) => (
                 <div key={row} className="space-y-4">
                   <div className="text-center font-bold text-slate-400 mb-2">DÃY {row}</div>
                   <div className="grid grid-cols-2 gap-2">
                     {Array.from({ length: 12 }).map((_, i) => (
                       <ShelfUnit 
                         key={i} 
                         id={`${row}-${100 + i + 1}`}
                         status={row === 'A' && i < 2 ? (i === 0 ? 'green' : 'yellow') : (row === 'B' && i === 3 ? 'yellow' : (Math.random() > 0.5 ? 'green' : 'red')) as 'green' | 'yellow' | 'red'} 
                         isSelected={row === 'B' && i === 3}
                         onSelect={setSelectedBin}
                       />
                     ))}
                   </div>
                 </div>
               ))}
            </div>
         </div>
       </div>

       {/* Detail Panel */}
       <div className="w-80 bg-white border-l border-border-light shadow-2xl z-20 flex flex-col h-[calc(100vh-64px)]">
          <div className="p-6 border-b border-border-light">
             <div className="flex items-center justify-between mb-2">
               <h2 className="font-extrabold text-xl text-slate-900">Chi tiết Bin</h2>
               <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">{selectedBin}</span>
             </div>
             <p className="text-sm text-slate-500 font-medium">Khu vực: Linh kiện điện tử</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
             <div>
               <div className="flex justify-between text-xs font-bold mb-2">
                 <span className="text-slate-500 uppercase">Tải trọng kệ</span>
                 <span className="text-primary">75%</span>
               </div>
               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full bg-amber-400" style={{ width: '75%' }}></div>
               </div>
             </div>
             <div>
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Danh sách sản phẩm</h3>
               <div className="space-y-4">
                 {[
                   { name: 'CPU Intel Core i7', sku: 'CPU-INT-001', qty: '12 Cái', icon: 'memory' },
                   { name: 'SSD Samsung 980 Pro', sku: 'SSD-SAM-980', qty: '28 Cái', icon: 'sd_storage' }
                 ].map((item, idx) => (
                   <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                        <span className="material-icons-round text-lg">{item.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{item.sku}</p>
                        <p className="text-xs font-bold text-primary mt-1">{item.qty}</p>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
             <div className="pt-4 space-y-2">
                <button className="w-full bg-primary text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                  <span className="material-icons-round text-sm">edit_location_alt</span> Chuyển vị trí
                </button>
                <button className="w-full bg-white border border-border-light text-slate-700 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
                  Xem lịch sử Bin
                </button>
             </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-border-light text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Cập nhật lúc: 14:32 - 14/10/2023</p>
          </div>
       </div>
    </div>
  );
};

export default RackMap;