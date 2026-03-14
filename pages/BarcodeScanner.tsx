import React from 'react';

const BarcodeScanner: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-10" style={{backgroundImage: 'radial-gradient(#1d6ac9 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
      
      {/* Top Bar for Scanner specific details */}
      <div className="bg-white/90 backdrop-blur border-b border-slate-200 px-8 py-3 flex justify-between items-center z-10">
         <div className="flex items-center gap-3">
            <span className="material-icons-round text-primary">qr_code_scanner</span>
            <span className="font-bold text-slate-800 uppercase tracking-wider">Scanner Terminal 01</span>
         </div>
         <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">CONNECTED: HID MODE</div>
      </div>

      <div className="flex-1 flex overflow-hidden z-10 p-8 gap-8">
         <div className="flex-1 flex flex-col gap-6">
            <div className="bg-white p-10 rounded-2xl shadow-xl border-2 border-primary/10 flex flex-col items-center justify-center text-center group">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Sẵn sàng quét mã vạch sản phẩm</label>
               <div className="relative w-full max-w-2xl">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                     <span className="material-icons-round text-primary text-4xl animate-pulse">qr_code_scanner</span>
                  </div>
                  <input autoFocus className="block w-full pl-20 pr-4 py-8 bg-slate-50 border-2 border-slate-200 rounded-2xl text-4xl font-bold text-slate-900 placeholder-slate-300 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-inner outline-none" placeholder="Quét hoặc nhập SKU..." type="text" />
               </div>
               <p className="mt-6 text-slate-400 text-sm font-medium">Hệ thống tự động nhận diện mã vạch và tải thông tin sản phẩm.</p>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Lịch Sử Quét Gần Đây</h2>
                  <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded font-bold">Mới nhất</span>
               </div>
               <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left">
                     <thead className="bg-white text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                        <tr>
                           <th className="px-6 py-3">Thời gian</th>
                           <th className="px-6 py-3">Sản phẩm</th>
                           <th className="px-6 py-3">Mã SKU</th>
                           <th className="px-6 py-3 text-right">Qty</th>
                           <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 text-sm">
                        {[1, 2, 3].map((i) => (
                           <tr key={i} className="hover:bg-slate-50">
                              <td className="px-6 py-3 text-slate-500 font-mono text-xs">14:24:55</td>
                              <td className="px-6 py-3 font-bold text-slate-800">Thùng Carton A1</td>
                              <td className="px-6 py-3 font-mono text-primary text-xs font-bold">SKU-9921-X1</td>
                              <td className="px-6 py-3 text-right font-bold">50</td>
                              <td className="px-6 py-3 text-center"><span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Success</span></td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* Side Panel */}
         <div className="w-[400px] bg-white rounded-2xl shadow-2xl border-l border-slate-100 p-8 flex flex-col">
            <div className="aspect-square bg-slate-50 rounded-xl mb-6 relative overflow-hidden border border-slate-200 group">
               <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvnjUeDuGiNSkA9YNBmsDTqwl23S4gI_ORpv_gZZUktjFoJulOzblV1sc2a-DipCJZ5ulLjFFFnZsolz2z8fLs_XtDEmDewgHlUpHZ3z8C9paj4XVnJmayIS4ylmDyPwhxRapi5xOBoP7NN4dLfRRBfV_wLT9OmzICcBVdgItk0XlpbYMfA9zLOSOT_cBxwSdmG5RS_Dwa1oWDB6FqLmwNqMRxx9uv0W9h0zIe6835fUBa6x_ZDFr3hGd8T4zXvE76icLfNni8DXSy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded uppercase mb-1 inline-block">Vật Tư</span>
                  <h3 className="text-xl font-extrabold text-white leading-tight">Thùng Carton A1</h3>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mã SKU</p>
                  <p className="font-mono font-bold text-primary">SKU-9921-X1</p>
               </div>
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Tồn kho</p>
                  <p className="font-bold text-slate-800">1,240</p>
               </div>
            </div>

            <div className="flex-1">
               <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Nhập Số Lượng</label>
               <div className="flex items-center justify-between mb-4">
                  <button className="w-10 h-10 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center justify-center"><span className="material-icons-round">remove</span></button>
                  <div className="text-3xl font-black text-primary">50</div>
                  <button className="w-10 h-10 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center justify-center"><span className="material-icons-round">add</span></button>
               </div>
               
               {/* Keypad simulation */}
               <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                     <button key={n} className="py-3 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-lg text-slate-700 shadow-sm">{n}</button>
                  ))}
                  <button className="py-3 bg-red-50 text-red-600 font-bold rounded-lg shadow-sm">DEL</button>
                  <button className="py-3 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-lg text-slate-700 shadow-sm">0</button>
                  <button className="py-3 bg-primary/10 text-primary font-bold rounded-lg shadow-sm">C</button>
               </div>
            </div>
            
            <button className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-colors">
               <span className="material-icons-round">check_circle</span> XÁC NHẬN
            </button>
         </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;