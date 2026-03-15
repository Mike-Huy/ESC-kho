import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface InboundListProps {
  onReceive: (poCode: string) => void;
  onNew: () => void;
}

const InboundList: React.FC<InboundListProps> = ({ onReceive, onNew }) => {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('po')
        .select(`
          id,
          po_code,
          supplier_name,
          order_date,
          status,
          total_amount
        `);

      // Filter by website_id
      query = query.contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      const { data, error } = await query.order('order_date', { ascending: false });

      if (error) throw error;
      setPos(data || []);
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPos = pos.filter(po => 
    po.po_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'received': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'draft': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Đơn nhập</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Danh sách hàng nhập</span>
          </nav>
          <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
            <span className="p-2 bg-blue-100 rounded-lg">
              <span className="material-icons-round text-primary">inventory</span>
            </span>
            Quản Lý Đơn Nhập
          </h1>
        </div>
        <button 
          onClick={onNew}
          className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-icons-round">add</span>
          TẠO ĐƠN MỚI
        </button>
      </header>

      <div className="bg-white rounded-[2rem] border border-border-light shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border-light flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative w-full md:w-96">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                placeholder="Tìm mã PO hoặc nhà cung cấp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                Hiển thị {filteredPos.length} kết quả
              </span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Đơn Nhập</th>
                <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà Cung Cấp</th>
                <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày Đặt</th>
                <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá Trị</th>
                <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng Thái</th>
                <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan={6} className="py-20 text-center">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                   </td>
                </tr>
              ) : filteredPos.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-20 text-center text-slate-400 font-bold">Không tìm thấy đơn hàng nào</td>
                </tr>
              ) : (
                filteredPos.map((po) => (
                  <tr key={po.id} className="group hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-3">
                       <button 
                         onClick={() => onReceive(po.po_code)}
                         className="font-mono font-black text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 hover:bg-primary hover:text-white transition-all scale-95 active:scale-90"
                       >
                         {po.po_code}
                       </button>
                    </td>
                    <td className="px-8 py-3">
                       <div className="font-bold text-slate-800 uppercase tracking-tighter">{po.supplier_name}</div>
                    </td>
                    <td className="px-8 py-3">
                       <div className="text-sm font-bold text-slate-600">{new Date(po.order_date).toLocaleDateString('vi-VN')}</div>
                    </td>
                    <td className="px-8 py-3">
                       <div className="text-sm font-black text-slate-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(po.total_amount || 0)}</div>
                    </td>
                    <td className="px-8 py-3 text-center">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(po.status)}`}>
                         {po.status === 'received' ? 'Đã nhận' : 
                          po.status === 'pending' ? 'Chờ nhận' : 
                          po.status === 'draft' ? 'Nháp' : po.status}
                       </span>
                    </td>
                    <td className="px-8 py-3 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {(po.status === 'pending' || po.status === 'draft') && (
                            <button 
                              onClick={() => onReceive(po.po_code)}
                              className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-md shadow-primary/20"
                            >
                              Nhận Hàng
                            </button>
                          )}
                          <button 
                            onClick={() => onReceive(po.po_code)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm"
                          >
                             <span className="material-icons-round text-xl">visibility</span>
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InboundList;
