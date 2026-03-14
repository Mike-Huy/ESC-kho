import React from 'react';
import RackMap from './RackMap'; // Reusing the map component logic but we'll override visual style via CSS in index.html if needed, or just reuse structure

const PutAway: React.FC = () => {
  return (
    <div className="flex h-full relative">
       {/* Use same rack map visualization but different context */}
       <div className="flex-1 overflow-auto custom-scrollbar p-12 warehouse-grid relative bg-white h-[calc(100vh-64px)]">
           <div className="relative border-4 border-slate-200 rounded-lg bg-slate-50/50 min-w-[1000px] h-[800px] shadow-inner mx-auto">
             {/* Simplified Rack representation for suggestion */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <h1 className="text-4xl font-black text-slate-200 uppercase transform -rotate-12">Khu Vực Nhập Kho</h1>
             </div>
             {/* Just a placeholder for the visual map, reusing RackMap logic in real app */}
              <div className="p-16 grid grid-cols-4 gap-20">
                <div className="space-y-4">
                  <div className="text-center font-bold text-slate-400 mb-2">DÃY A</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-10 bg-emerald-500 border-2 border-emerald-600 rounded relative group animate-pulse-ring z-10">
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white">#1</span>
                    </div>
                     {Array.from({length: 11}).map((_, i) => <div key={i} className="h-10 bg-slate-200 rounded opacity-50"></div>)}
                  </div>
                </div>
                 {/* Other racks faded out */}
                 {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="space-y-4 opacity-30 grayscale">
                       <div className="h-4 bg-slate-300 rounded w-1/2 mx-auto mb-2"></div>
                       <div className="grid grid-cols-2 gap-2">
                          {Array.from({length: 12}).map((__, j) => <div key={j} className="h-10 bg-slate-200 rounded"></div>)}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
       </div>

       {/* Suggestion Panel */}
       <div className="w-96 bg-white border-l border-border-light shadow-2xl z-20 flex flex-col h-[calc(100vh-64px)]">
           <div className="p-6 border-b border-border-light bg-blue-50/30">
              <div className="flex items-center gap-2 mb-2 text-primary">
                 <span className="material-icons-round">auto_awesome</span>
                 <h2 className="font-extrabold text-lg text-slate-900">Gợi ý vị trí nhập kho</h2>
              </div>
              <div className="p-3 bg-white border border-blue-100 rounded-lg shadow-sm flex items-center gap-3">
                 <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                    <span className="material-icons-round text-2xl">laptop</span>
                 </div>
                 <div>
                    <p className="text-sm font-bold text-slate-800">Laptop Workstation Z2</p>
                    <p className="text-[10px] text-slate-500 font-medium">Danh mục: Điện tử • Xuất: Cao</p>
                 </div>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Top 3 vị trí tối ưu nhất</p>
              
              <div className="relative group">
                 <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary rounded-full"></div>
                 <div className="bg-white border border-blue-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                       <div>
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded">TOP 1</span>
                             <h3 className="font-extrabold text-lg text-slate-800">A-101</h3>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">Gần cửa nhập 01 • Trống 100%</p>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600">Độ ưu tiên</p>
                          <p className="text-lg font-black text-emerald-600 leading-none">98%</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button className="flex-1 bg-primary text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors">
                          <span className="material-icons-round text-sm">near_me</span> Dẫn đường
                       </button>
                    </div>
                 </div>
              </div>

              {/* Other suggestions */}
              {[
                { top: 'TOP 2', loc: 'C-103', note: 'Khu vực cùng loại', score: '84%' },
                { top: 'TOP 3', loc: 'B-203', note: 'Tối ưu diện tích', score: '72%' }
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm opacity-70 hover:opacity-100 transition-opacity">
                   <div className="flex justify-between items-start mb-3">
                       <div>
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">{s.top}</span>
                             <h3 className="font-extrabold text-lg text-slate-800">{s.loc}</h3>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{s.note}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-bold text-slate-400">Độ ưu tiên</p>
                          <p className="text-lg font-black text-slate-400 leading-none">{s.score}</p>
                       </div>
                    </div>
                    <button className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5">Dẫn đường</button>
                </div>
              ))}
           </div>
           
           <div className="p-5 bg-slate-50 border-t border-border-light">
               <button className="w-full bg-navy-accent text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
                  Xác nhận Nhập kho Vị trí #1
               </button>
           </div>
       </div>
    </div>
  );
};

export default PutAway;
