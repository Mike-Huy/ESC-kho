import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

const InboundReturn: React.FC = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      // Fetch failed SOs that need to be returned to stock
      const { data, error } = await supabase
        .from('so')
        .select(`
          id,
          so_code,
          customer_name,
          status,
          created_at,
          total_amount,
          so_items (
            product_code,
            qty
          )
        `)
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .in('status', ['returned', 'cancelled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      <header>
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100 uppercase font-black text-xs">
              <span className="material-icons-round">assignment_return</span>
           </div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">XỬ LÝ HÀNG TRẢ (RETURN)</h1>
        </div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest pl-1">Nhập lại kho các đơn hàng giao không thành công</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          </div>
        ) : returns.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[2.5rem] border border-slate-100 text-center">
             <div className="flex flex-col items-center opacity-30">
                <span className="material-icons-round text-6xl mb-4">check_circle_outline</span>
                <p className="font-black uppercase tracking-widest">Không có hàng chờ xử lý</p>
             </div>
          </div>
        ) : (
          returns.map((item) => (
            <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 hover:border-rose-300 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <span className="text-primary font-black text-lg tracking-tight mb-1 block">#{item.so_code}</span>
                   <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{item.customer_name}</h4>
                </div>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  item.status === 'returned' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {item.status === 'returned' ? 'HOÀN ĐƠN' : 'ĐÃ HỦY'}
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-2 text-slate-500">
                   <span className="material-icons-round text-sm">schedule</span>
                   <span className="text-xs font-bold">{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                   <span className="material-icons-round text-sm">payments</span>
                   <span className="text-xs font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_amount || 0)}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                 <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <span className="material-icons-round text-lg">check_circle</span>
                    XÁC NHẬN NHẬP KHO
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InboundReturn;
