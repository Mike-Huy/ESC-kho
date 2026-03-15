import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface RoutingOrder {
  id: number;
  so_code: string;
  customer_name: string;
  delivery_address: string;
  status: string;
  route_name?: string;
  delivery_time?: string;
}

const Routing: React.FC = () => {
  const [orders, setOrders] = useState<RoutingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadyToShip();
  }, []);

  const fetchReadyToShip = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('so')
        .select('id, so_code, customer_name, delivery_address, status, created_at')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .in('status', ['shipped', 'completed']) // Mocking orders ready for dispatch
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setOrders(data.map((o: any) => ({
          ...o,
          route_name: ['Tuyến Quận 1', 'Tuyến Quận 7', 'Tuyến Thủ Đức', 'Tuyến Bình Chánh'][Math.floor(Math.random() * 4)],
          delivery_time: '14:00 - 18:00'
        })));
      }
    } catch (error) {
      console.error('Error fetching routing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">BÀN GIAO & XẾP TUYẾN (ROUTING)</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Phân chia đơn hàng cho shipper và đội xe vận chuyển</p>
        </div>
        <button className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2">
           <span className="material-icons-round">local_shipping</span>
           TẠO CHUYẾN XE MỚI
        </button>
      </header>

      {loading ? (
        <div className="p-20 text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-6">
           {['Tuyến Quận 1', 'Tuyến Quận 7', 'Tuyến Thủ Đức', 'Tuyến Bình Chánh'].map((route) => {
              const routeOrders = orders.filter(o => o.route_name === route);
              if (routeOrders.length === 0) return null;

              return (
                <div key={route} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                   <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <span className="material-icons-round">route</span>
                         </div>
                         <div>
                            <h3 className="font-black text-lg tracking-tight uppercase">{route}</h3>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{routeOrders.length} ĐƠN HÀNG TRONG TUYẾN</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="text-right">
                             <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tài xế Dự kiến</p>
                             <p className="text-sm font-black text-primary">Nguyễn Văn A - 090xxxxxxx</p>
                         </div>
                         <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">SỬA TUYẾN</button>
                      </div>
                   </div>
                   <div className="p-6 overflow-x-auto">
                      <table className="w-full text-left">
                         <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                               <th className="pb-4">Mã đơn SO</th>
                               <th className="pb-4">Khách hàng</th>
                               <th className="pb-4">Địa chỉ giao hàng</th>
                               <th className="pb-4">Thời gian</th>
                               <th className="pb-4 text-center">Thao tác</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {routeOrders.map((order) => (
                              <tr key={order.id} className="group hover:bg-slate-50 transition-all">
                                 <td className="py-4 font-black text-sm text-primary">{order.so_code}</td>
                                 <td className="py-4 font-black text-sm text-slate-800">{order.customer_name}</td>
                                 <td className="py-4 text-[12px] font-bold text-slate-500 max-w-xs truncate">{order.delivery_address || 'N/A'}</td>
                                 <td className="py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">{order.delivery_time}</td>
                                 <td className="py-4 text-center">
                                    <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center mx-auto">
                                       <span className="material-icons-round text-lg">delete</span>
                                    </button>
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              );
           })}
        </div>
      )}
    </div>
  );
};

export default Routing;
