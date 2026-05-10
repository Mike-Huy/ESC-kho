import React, { useState, useEffect } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface PickingOrder {
  id: number;
  so_code: string;
  customer_name: string;
  status: string;
  total_items: number;
  picked_items: number;
  created_at: string;
  items?: any[];
}

const Picking: React.FC = () => {
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PickingOrder | null>(null);

  useEffect(() => {
    fetchPickingOrders();
  }, []);

  const fetchPickingOrders = async () => {
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
          ${TABLE('so_items')}!inner (
            id,
            product_code,
            qty,
            ${TABLE('product')}!inner (
              product_long,
              unit,
              website_id
            )
          )
        `)
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .filter(`${TABLE('so_items')}.${TABLE('product')}.website_id`, 'cs', `{${APP_CONFIG.WEBSITE_ID}}`)
        .in('status', ['pending', 'new'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setOrders(data.map((o: any) => {
          const rawItems = o[TABLE('so_items')] || [];
          return {
            ...o,
            total_items: rawItems.reduce((acc: number, item: any) => acc + (Number(item.qty) || 0), 0) || 0,
            picked_items: 0,
            items: rawItems.map((item: any) => ({
              ...item,
              product: item[TABLE('product')]
            }))
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching picking orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishPicking = async () => {
    if (!selectedOrder) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from(TABLE('so'))
        .update({ status: 'processing' })
        .eq('so_code', selectedOrder.so_code);

      if (error) throw error;

      alert(`Đã hoàn tất soạn hàng đơn #${selectedOrder.so_code}! Đơn hàng đã chuyển sang trạng thái "ĐÓNG GÓI".`);
      setSelectedOrder(null);
      fetchPickingOrders();
    } catch (err) {
      console.error('Error completing picking:', err);
      alert('Có lỗi xảy ra khi hoàn tất soạn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickStart = (order: PickingOrder) => {
    setSelectedOrder(order);
  };

  if (selectedOrder) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
              <span className="material-icons-round">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">SOẠN ĐƠN #{selectedOrder.so_code}</h1>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{selectedOrder.customer_name}</p>
            </div>
          </div>
          <button onClick={handleFinishPicking} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">HOÀN TẤT SOẠN HÀNG</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
             {selectedOrder.items?.map((item: any, idx: number) => (
               <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 font-black text-primary text-xl">
                        {idx + 1}
                     </div>
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black uppercase tracking-tighter">{item.product_code}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black uppercase tracking-tighter">VỊ TRÍ: A-{Math.floor(Math.random() * 10)}-{Math.floor(Math.random() * 5)}</span>
                        </div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight">{item.product?.product_long}</h4>
                     </div>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng</p>
                        <p className="text-2xl font-black text-slate-900">{item.qty} {item.product?.unit}</p>
                     </div>
                     <button className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-primary transition-all">
                        <span className="material-icons-round">check</span>
                     </button>
                  </div>
               </div>
             ))}
          </div>
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <h3 className="text-primary text-[10px] font-black uppercase tracking-widest mb-6">Trạm quét Picking</h3>
                <div className="relative mb-6">
                   <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-white/30">qr_code_scanner</span>
                   <input className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:bg-white/10 transition-all text-sm font-bold" placeholder="Quét mã SP để xác nhận..." />
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center text-xs font-bold text-white/40 uppercase tracking-widest">
                      <span>Tiến độ soạn hàng</span>
                      <span>0 / {selectedOrder.total_items}</span>
                   </div>
                   <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-primary w-0 transition-all duration-1000"></div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">SOẠN ĐƠN HÀNG (PICKING)</h1>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Lấy hàng từ kho theo danh sách đơn SO</p>
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
               <p className="font-black uppercase tracking-widest">Không có đơn hàng cần soạn</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden lg:flex items-center px-8 py-4 bg-slate-50 border border-slate-100/60 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-[18%]">Mã đơn SO</div>
                <div className="w-[42%]">Khách hàng</div>
                <div className="w-[15%]">Số mặt hàng</div>
                <div className="w-[13%]">Ngày đặt</div>
                <div className="w-[12%] text-right">Thao tác</div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex flex-col lg:flex-row lg:items-center px-8 py-5 bg-white border border-slate-100/80 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-primary/25 hover:translate-x-1.5 transition-all duration-300 group"
                  >
                    {/* SO Code */}
                    <div className="w-full lg:w-[18%] mb-3 lg:mb-0 flex items-center justify-between lg:justify-start">
                      <span className="text-primary font-black text-sm tracking-tight bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                        #{order.so_code}
                      </span>
                      <span className="lg:hidden text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-blue-100">
                        MỚI
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="w-full lg:w-[42%] mb-3 lg:mb-0">
                      <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-tight group-hover:text-primary transition-colors leading-relaxed">
                        {order.customer_name}
                      </h4>
                    </div>

                    {/* Total Items */}
                    <div className="w-full lg:w-[15%] mb-3 lg:mb-0 flex items-center gap-2 text-slate-600">
                      <span className="material-icons-round text-slate-400 text-lg">inventory_2</span>
                      <span className="text-xs font-black uppercase tracking-widest">
                        <span className="text-primary">{order.total_items}</span> mặt hàng
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="w-full lg:w-[13%] mb-4 lg:mb-0 text-xs font-bold text-slate-400 flex items-center gap-2">
                      <span className="material-icons-round text-slate-300 text-lg lg:hidden">calendar_today</span>
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </div>

                    {/* Action Button */}
                    <div className="w-full lg:w-[12%] text-right">
                      <button 
                        onClick={() => handlePickStart(order)}
                        className="w-full lg:w-auto px-5 py-3 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-primary transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 select-none hover:shadow-lg hover:shadow-primary/20"
                      >
                        <span className="material-icons-round text-sm">panning_alt</span>
                        Soạn hàng
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Picking;
