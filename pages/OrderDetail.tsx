import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface OrderDetailProps {
  orderCode: string | null;
  onBack: () => void;
}

interface OrderItem {
  id: number;
  product_code: string;
  qty: number;
  unit: string;
  product?: {
    product_long: string;
    image: string;
    sn_control: boolean;
  };
  assigned_serials: string[];
}

const OrderDetail: React.FC<OrderDetailProps> = ({ orderCode, onBack }) => {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSNSelector, setShowSNSelector] = useState<{itemIdx: number, productCode: string} | null>(null);
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [snLoading, setSNLoading] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderCode) return;
      try {
        setLoading(true);
        
        // 1. Fetch SO
        const { data: soData, error: soError } = await supabase
          .from('so')
          .select('*')
          .eq('so_code', orderCode)
          .single();
        
        if (soError) throw soError;
        setOrder(soData);

        // 2. Fetch SO Items with Product Data
        const { data: itemData, error: itemError } = await supabase
          .from('so_items')
          .select(`
            id,
            product_code,
            qty,
            unit,
            product:product_code (
              product_long,
              image,
              sn_control
            )
          `)
          .eq('so_id', soData.id);
        
        if (itemError) throw itemError;

        // 3. Fetch already assigned S/Ns for this order
        const { data: snData, error: snError } = await supabase
          .from('serial_tracking')
          .select('product_code, serial_number')
          .eq('so_code', orderCode);
        
        if (snError) throw snError;

        const mappedItems = itemData.map((item: any) => ({
          ...item,
          assigned_serials: snData
            ?.filter(sn => sn.product_code === item.product_code)
            .map(sn => sn.serial_number) || []
        }));

        setItems(mappedItems);
        
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderCode]);

  const fetchAvailableSerials = async (productCode: string) => {
    try {
      setSNLoading(true);
      const { data, error } = await supabase
        .from('serial_tracking')
        .select('serial_number')
        .eq('product_code', productCode)
        .eq('status', 'available');
      
      if (error) throw error;
      setAvailableSerials(data || []);
    } catch (error) {
      console.error('Error fetching available S/Ns:', error);
    } finally {
      setSNLoading(false);
    }
  };

  const assignSN = async (itemIdx: number, serialNumber: string) => {
    try {
      const item = items[itemIdx];
      if (item.assigned_serials.length >= item.qty) {
        alert('Đã gán đủ số lượng S/N cho mặt hàng này!');
        return;
      }

      const { error } = await supabase
        .from('serial_tracking')
        .update({ 
          so_code: orderCode,
          status: 'sold' // or 'reserved'
        })
        .eq('serial_number', serialNumber);

      if (error) throw error;

      const newItems = [...items];
      newItems[itemIdx].assigned_serials.push(serialNumber);
      setItems(newItems);
      
      // Update available list
      setAvailableSerials(availableSerials.filter(s => s.serial_number !== serialNumber));
      
    } catch (error) {
      console.error('Error assigning S/N:', error);
    }
  };

  const unassignSN = async (itemIdx: number, serialNumber: string) => {
    try {
      const { error } = await supabase
        .from('serial_tracking')
        .update({ 
          so_code: null,
          status: 'available'
        })
        .eq('serial_number', serialNumber);

      if (error) throw error;

      const newItems = [...items];
      newItems[itemIdx].assigned_serials = newItems[itemIdx].assigned_serials.filter(s => s !== serialNumber);
      setItems(newItems);
      
    } catch (error) {
      console.error('Error unassigning S/N:', error);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  if (!order) return <div className="p-10 text-center">Không tìm thấy đơn hàng</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
            <button onClick={onBack} className="hover:text-primary transition-colors">Quản lý đơn hàng</button>
            <span className="mx-2">/</span>
            <span className="text-primary">{orderCode}</span>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="md:hidden"><span className="material-icons-round">arrow_back</span></button>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Đơn hàng #{orderCode}</h2>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              order.status === 'pending' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg"><span className="material-icons-round text-primary text-xl">person</span></div>
                <h3 className="font-extrabold text-slate-800 uppercase text-xs tracking-widest">Khách hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Họ và Tên</p>
                  <p className="font-bold text-slate-900">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Điện thoại</p>
                  <p className="font-bold text-slate-700">{order.customer_phone}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg"><span className="material-icons-round text-emerald-600 text-xl">local_shipping</span></div>
                <h3 className="font-extrabold text-slate-800 uppercase text-xs tracking-widest">Giao hàng</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Địa chỉ</p>
                  <p className="font-bold text-slate-700 text-sm leading-relaxed">{order.delivery_address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product List */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Danh sách sản phẩm</h3>
              <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">{items.length} MẶT HÀNG</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <div key={idx} className="p-6 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 p-2">
                        <img 
                          className="w-full h-full object-contain" 
                          src={item.product?.image || "https://lh3.googleusercontent.com/..."} 
                          alt={item.product?.product_long}
                        />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm">{item.product?.product_long}</p>
                        <p className="text-[10px] font-mono font-bold text-primary mt-1">{item.product_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                       <div className="text-center">
                          <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">Số lượng</p>
                          <p className="font-black text-slate-900">{item.qty} <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span></p>
                       </div>
                    </div>
                  </div>

                  {/* Serial Number Section */}
                  {item.product?.sn_control && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 border-dashed">
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                            <span className="material-icons-round text-primary text-sm">qr_code</span>
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">Serial Numbers ({item.assigned_serials.length}/{item.qty})</span>
                         </div>
                         {item.assigned_serials.length < item.qty && (
                            <button 
                              onClick={() => { setShowSNSelector({itemIdx: idx, productCode: item.product_code}); fetchAvailableSerials(item.product_code); }}
                              className="text-[10px] font-black bg-primary text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 transition-all uppercase"
                            >
                              Gán S/N
                            </button>
                         )}
                      </div>
                      
                      {item.assigned_serials.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.assigned_serials.map((sn, sIdx) => (
                            <div key={sIdx} className="bg-white border border-primary/20 rounded-xl px-3 py-1.5 flex items-center gap-3 group shadow-sm">
                               <span className="text-xs font-mono font-black text-primary">{sn}</span>
                               <button 
                                 onClick={() => unassignSN(idx, sn)}
                                 className="text-slate-300 hover:text-rose-500 transition-colors"
                               >
                                 <span className="material-icons-round text-[14px]">cancel</span>
                               </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[10px] text-primary/40 font-black uppercase border border-primary/5 rounded-xl border-dashed">
                           Chưa gán Serial Number
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Totals and Summary */}
        <div className="space-y-6">
           <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
              <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-white/40 mb-6">Tổng kết đơn hàng</h3>
              <div className="space-y-4 relative z-10">
                 <div className="flex justify-between items-center text-sm font-bold text-white/60">
                    <span>Tạm tính</span>
                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.subtotal || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-bold text-white/60">
                    <span>Phí vận chuyển</span>
                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.shipping_fee || 0)}</span>
                 </div>
                 <div className="h-px bg-white/10 my-4"></div>
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest">Tổng cộng</span>
                    <span className="text-2xl font-black text-white">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount || 0)}</span>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <button 
                disabled={items.some(i => i.product?.sn_control && i.assigned_serials.length < i.qty)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 disabled:grayscale uppercase text-xs tracking-widest"
              >
                 <span className="material-icons-round">check_circle</span>
                 Xác nhận đóng gói
              </button>
              {items.some(i => i.product?.sn_control && i.assigned_serials.length < i.qty) && (
                <p className="text-[10px] text-rose-500 font-bold mt-3 text-center uppercase tracking-tighter">Vui lòng gán đầy đủ S/N trước khi xác nhận</p>
              )}
           </div>
        </div>
      </div>

      {/* S/N Selector Modal */}
      {showSNSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[70vh] shadow-2xl animate-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase">Gán Serial Number</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{showSNSelector.productCode}</p>
               </div>
               <button onClick={() => setShowSNSelector(null)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"><span className="material-icons-round text-sm">close</span></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               {snLoading ? (
                 <div className="p-10 text-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div></div>
               ) : availableSerials.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 font-bold text-sm">Không còn S/N khả dụng cho sản phẩm này!</div>
               ) : (
                 <div className="grid grid-cols-1 gap-2">
                   {availableSerials.map((sn, idx) => (
                     <button 
                       key={idx}
                       onClick={() => assignSN(showSNSelector.itemIdx, sn.serial_number)}
                       className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-between group"
                     >
                       <span className="font-mono font-black text-slate-700">{sn.serial_number}</span>
                       <span className="material-icons-round text-primary opacity-0 group-hover:opacity-100 transition-opacity">add_circle</span>
                     </button>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;