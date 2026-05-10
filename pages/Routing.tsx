import React, { useState, useEffect } from 'react';
import { supabase, TABLE } from '../supabaseClient';
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
        .from(TABLE('so'))
        .select('id, so_code, customer_name, delivery_address, status, created_at')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .eq('status', 'shipped')
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

  const handleFinishDelivery = async (soCode: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from(TABLE('so'))
        .update({ status: 'completed' })
        .eq('so_code', soCode);

      if (error) throw error;

      alert(`Đã hoàn tất xác nhận giao hàng cho đơn #${soCode}! Đơn hàng hiện chuyển sang trạng thái "HOÀN TẤT".`);
      fetchReadyToShip();
    } catch (err) {
      console.error('Error completing delivery:', err);
      alert('Có lỗi xảy ra khi xác nhận giao hàng.');
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
                    <div className="p-6 space-y-4 bg-slate-50/30">
                      {/* Header */}
                      <div className="hidden lg:flex items-center px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white/40 rounded-xl">
                        <div className="w-[18%]">Mã đơn SO</div>
                        <div className="w-[30%]">Khách hàng</div>
                        <div className="w-[32%]">Địa chỉ giao hàng</div>
                        <div className="w-[12%]">Thời gian</div>
                        <div className="w-[8%] text-right">Xác nhận</div>
                      </div>

                      {/* Rows */}
                      <div className="space-y-2.5">
                        {routeOrders.map((order) => (
                          <div 
                            key={order.id} 
                            className="flex flex-col lg:flex-row lg:items-center px-6 py-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-primary/20 hover:translate-x-1 transition-all duration-300 group"
                          >
                            {/* SO Code */}
                            <div className="w-full lg:w-[18%] mb-2 lg:mb-0">
                              <span className="text-primary font-black text-sm tracking-tight bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                                #{order.so_code}
                              </span>
                            </div>

                            {/* Customer */}
                            <div className="w-full lg:w-[30%] mb-2 lg:mb-0">
                              <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-tight group-hover:text-primary transition-colors leading-relaxed">
                                {order.customer_name}
                              </h4>
                            </div>

                            {/* Delivery Address */}
                            <div className="w-full lg:w-[32%] mb-2 lg:mb-0 flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
                              <span className="material-icons-round text-slate-400 text-base">place</span>
                              <span className="truncate max-w-xs">{order.delivery_address || 'Chưa cập nhật'}</span>
                            </div>

                            {/* Delivery Time */}
                            <div className="w-full lg:w-[12%] mb-3 lg:mb-0 flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="material-icons-round text-slate-300 text-base lg:hidden">schedule</span>
                              {order.delivery_time}
                            </div>

                            {/* Action Button */}
                            <div className="w-full lg:w-[8%] text-right">
                              <button 
                                onClick={() => handleFinishDelivery(order.so_code)}
                                className="w-full lg:w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center lg:ml-auto shadow-sm"
                                title="Xác nhận đã giao hàng"
                              >
                                <span className="material-icons-round text-lg">check</span>
                              </button>
                            </div>
                          </div>
                        ))}
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

export default Routing;
