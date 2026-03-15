import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface PackingOrder {
  id: number;
  so_code: string;
  customer_name: string;
  status: string;
  total_qty: number;
  packed_qty: number;
  created_at: string;
}

const Packing: React.FC = () => {
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackingOrders();
  }, []);

  const fetchPackingOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('so')
        .select(`
          id,
          so_code,
          customer_name,
          status,
          created_at,
          so_items (
            qty
          )
        `)
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .in('status', ['processing', 'shipped'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setOrders(data.map((o: any) => ({
          ...o,
          total_qty: o.so_items?.reduce((acc: number, item: any) => acc + (Number(item.qty) || 0), 0) || 0,
          packed_qty: o.status === 'shipped' ? o.so_items?.reduce((acc: number, item: any) => acc + (Number(item.qty) || 0), 0) : Math.floor(Math.random() * 5), // Mocking partially packed
        })));
      }
    } catch (error) {
      console.error('Error fetching packing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">ĐÓNG GÓI HÀNG HÓA (PACKING)</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Kiểm tra và đóng thùng các đơn hàng đã soạn</p>
        </div>
        <div className="bg-slate-900 rounded-2xl p-4 flex gap-6 text-white shadow-xl">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Đang đóng gói</span>
              <span className="text-xl font-black">{orders.filter(o => o.packed_qty < o.total_qty).length} ĐƠN</span>
           </div>
           <div className="w-px bg-white/10"></div>
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Đã sẵn sàng xuất</span>
              <span className="text-xl font-black">{orders.filter(o => o.packed_qty === o.total_qty).length} ĐƠN</span>
           </div>
        </div>
      </header>

      {loading ? (
        <div className="p-20 text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {orders.map((order) => {
            const progress = (order.packed_qty / order.total_qty) * 100;
            const isDone = progress === 100;

            return (
              <div key={order.id} className={`bg-white rounded-[2.5rem] border transition-all duration-300 overflow-hidden shadow-xl shadow-slate-200/50 ${isDone ? 'border-emerald-500/30' : 'border-slate-100'}`}>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-primary font-black text-lg tracking-tight">#{order.so_code}</span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                        isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {isDone ? 'ĐÃ ĐÓNG GÓI' : 'ĐANG PACK'}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight mb-8">{order.customer_name}</h4>
                  
                  <div className="space-y-2 mb-8">
                    <div className="flex justify-between items-end">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ kiện hàng</p>
                       <p className="text-xs font-black text-slate-900">{order.packed_qty} / {order.total_qty}</p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-primary'}`} 
                         style={{ width: `${progress}%` }}
                       ></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                     <button className="flex-1 bg-slate-900 text-white h-12 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95">XEM CHI TIẾT</button>
                     <button className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                        isDone ? 'bg-emerald-100 border-emerald-500 text-emerald-600' : 'border-slate-100 text-slate-400 hover:border-primary hover:text-primary'
                     }`}>
                        <span className="material-icons-round">{isDone ? 'verified' : 'qr_code_scanner'}</span>
                     </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Packing;
