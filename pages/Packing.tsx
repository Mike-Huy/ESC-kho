import React, { useState, useEffect } from 'react';
import { supabase, TABLE } from '../supabaseClient';
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
        .from(TABLE('so'))
        .select(`
          id,
          so_code,
          customer_name,
          status,
          created_at,
          ${TABLE('so_items')} (
            qty
          )
        `)
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .eq('status', 'processing')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setOrders(data.map((o: any) => {
          const rawItems = o[TABLE('so_items')] || [];
          const total_qty = rawItems.reduce((acc: number, item: any) => acc + (Number(item.qty) || 0), 0) || 0;
          return {
            ...o,
            total_qty,
            packed_qty: Math.floor(total_qty * 0.6), // Mocking some partial packed progress
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching packing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishPacking = async (soCode: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from(TABLE('so'))
        .update({ status: 'shipped' })
        .eq('so_code', soCode);

      if (error) throw error;

      alert(`Đã hoàn tất đóng gói đơn #${soCode}! Đơn hàng đã chuyển sang trạng thái "XẾP TUYẾN".`);
      fetchPackingOrders();
    } catch (err) {
      console.error('Error completing packing:', err);
      alert('Có lỗi xảy ra khi hoàn tất đóng gói.');
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
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="py-20 text-center opacity-30">
               <span className="material-icons-round text-6xl mb-4">task_alt</span>
               <p className="font-black uppercase tracking-widest">Không có đơn hàng cần đóng gói</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden lg:flex items-center px-8 py-4 bg-slate-50 border border-slate-100/60 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-[18%]">Mã đơn SO</div>
                <div className="w-[35%]">Khách hàng</div>
                <div className="w-[20%]">Tiến độ đóng gói</div>
                <div className="w-[12%] text-center">Trạng thái</div>
                <div className="w-[15%] text-right">Thao tác</div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {orders.map((order) => {
                  const progress = (order.packed_qty / order.total_qty) * 100;
                  const isDone = progress === 100;

                  return (
                    <div 
                      key={order.id} 
                      className="flex flex-col lg:flex-row lg:items-center px-8 py-5 bg-white border border-slate-100/80 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-primary/25 hover:translate-x-1.5 transition-all duration-300 group"
                    >
                      {/* SO Code */}
                      <div className="w-full lg:w-[18%] mb-3 lg:mb-0 flex items-center justify-between lg:justify-start">
                        <span className="text-primary font-black text-sm tracking-tight bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                          #{order.so_code}
                        </span>
                        <span className={`lg:hidden text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {isDone ? 'ĐÃ ĐÓNG GÓI' : 'ĐANG PACK'}
                        </span>
                      </div>

                      {/* Customer */}
                      <div className="w-full lg:w-[35%] mb-3 lg:mb-0">
                        <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-tight group-hover:text-primary transition-colors leading-relaxed">
                          {order.customer_name}
                        </h4>
                      </div>

                      {/* Packing Progress */}
                      <div className="w-full lg:w-[20%] mb-3 lg:mb-0">
                        <div className="space-y-1.5 max-w-xs">
                          <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider">
                            <span className="lg:hidden">Tiến độ:</span>
                            <span className="text-slate-800">{order.packed_qty} / {order.total_qty} kiện</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100/30">
                            <div 
                              className={`h-full transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-primary'}`} 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="hidden lg:block w-full lg:w-[12%] mb-3 lg:mb-0 text-center">
                        <span className={`inline-block text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                          isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {isDone ? 'ĐÃ ĐÓNG GÓI' : 'ĐANG PACK'}
                        </span>
                      </div>

                      {/* Action Button */}
                      <div className="w-full lg:w-[15%] text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleFinishPacking(order.so_code)}
                          className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-primary transition-all shadow-md hover:shadow-lg hover:shadow-primary/20 active:scale-95 inline-flex items-center justify-center gap-2 select-none"
                        >
                          <span className="material-icons-round text-sm">inventory</span>
                          Đóng gói
                        </button>
                        <button className="w-10 h-10 rounded-xl border border-slate-200 hover:border-primary text-slate-400 hover:text-primary transition-all flex items-center justify-center bg-slate-50 shadow-sm active:scale-95">
                          <span className="material-icons-round text-lg">visibility</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Packing;
