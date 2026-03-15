import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface OrderListProps {
  onViewDetail: (id: string) => void;
}

// Dữ liệu mẫu Fallback
const MOCK_ORDERS: Order[] = [
  { id: 'ORD-2026-001', customer: 'Nguyễn Minh Tuấn', email: 'tuan.nm@example.com', status: 'processing', date: '10/02/2026', total: '2.450.000 ₫' },
  { id: 'ORD-2026-002', customer: 'Công ty TNHH ABC', email: 'contact@abc-corp.com', status: 'pending', date: '11/02/2026', total: '15.600.000 ₫' },
  { id: 'ORD-2026-003', customer: 'Phạm Thị Lan', email: 'lan.pham@example.com', status: 'shipped', date: '09/02/2026', total: '890.000 ₫' },
  { id: 'ORD-2026-004', customer: 'Lê Văn Hùng', email: 'hung.levan@example.com', status: 'cancelled', date: '08/02/2026', total: '3.200.000 ₫' },
];

const OrderList: React.FC<OrderListProps> = ({ onViewDetail }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Table is named 'so' (Sales Orders)
      let query = supabase
        .from('so')
        .select(`
          *,
          so_items!inner(
            product!inner(brand)
          )
        `);

      // Filter by website_id
      query = query.eq('website_id', APP_CONFIG.WEBSITE_ID);

      query = query.order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`so_code.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedOrders: Order[] = data.map((item: any) => ({
          id: item.so_code,
          customer: item.customer_name,
          email: item.customer_email || 'N/A',
          status: item.status,
          date: new Date(item.created_at).toLocaleDateString('vi-VN'),
          total: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_amount)
        }));
        setOrders(mappedOrders);
        setIsUsingMock(false);
      } else {
        if (!searchTerm) {
          setOrders(MOCK_ORDERS);
          setIsUsingMock(true);
        } else {
          setOrders([]);
          setIsUsingMock(false);
        }
      }
    } catch (error) {
      console.warn('Error fetching orders (using mock):', error);
      setOrders(MOCK_ORDERS);
      setIsUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'pending': 
      case 'new':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tighter"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></span>Mới</span>;
      case 'processing': 
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-tighter"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 animate-pulse"></span>Đang xử lý</span>;
      case 'shipped': 
      case 'completed':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-tighter"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>Hoàn tất</span>;
      case 'cancelled': 
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-tighter"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>Đã hủy</span>;
      default: 
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-50 text-slate-500 border border-slate-200 uppercase tracking-tighter">{status}</span>;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             DANH SÁCH ĐƠN HÀNG
            {isUsingMock && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 font-black uppercase tracking-widest">Demo</span>}
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Quản lý và vận hành đơn hàng (SO)</p>
        </div>
        <button className="bg-primary hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase text-sm tracking-widest">
          <span className="material-icons-round text-lg">add_circle</span>
          <span>Tạo đơn SO mới</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 relative group">
            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary outline-none text-sm font-bold transition-all" 
              placeholder="Tìm theo Mã đơn SO hoặc Tên khách hàng..." 
              type="text" 
            />
          </div>
          <div className="lg:col-span-3 relative">
             <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">filter_list</span>
             <select className="w-full pl-12 pr-10 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary outline-none text-sm font-bold appearance-none cursor-pointer transition-all">
                <option value="">Trạng thái</option>
                <option value="pending">Mới (Pending)</option>
                <option value="processing">Đang xử lý</option>
                <option value="shipped">Đã giao hàng</option>
             </select>
             <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
          <div className="lg:col-span-3 flex gap-3">
             <button type="submit" className="flex-1 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all">Tìm kiếm</button>
             <button className="w-14 h-14 border-2 border-slate-100 bg-white hover:bg-slate-50 rounded-2xl flex items-center justify-center transition-all text-slate-400 hover:text-primary">
                <span className="material-icons-round">file_download</span>
             </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden relative">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-20 text-center">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Đang truy vấn dữ liệu...</p>
             </div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                <th className="px-8 py-6">Mã đơn SO</th>
                <th className="px-8 py-6">Khách hàng</th>
                <th className="px-8 py-6 text-center">Trạng thái</th>
                <th className="px-8 py-6">Ngày đặt hàng</th>
                <th className="px-8 py-6 text-right">Tổng giá trị</th>
                <th className="px-8 py-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <span className="material-icons-round text-6xl mb-4">inventory_2</span>
                        <p className="font-black uppercase tracking-widest text-sm">Không có dữ liệu</p>
                      </div>
                   </td>
                </tr>
              ) : (
              orders.map((order, idx) => (
                <tr key={idx} className="group hover:bg-slate-50/50 transition-all duration-300">
                  <td className="px-8 py-6">
                    <span className="font-black text-primary text-sm tracking-tight">{order.id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm">{order.customer}</span>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{order.email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">{getStatusBadge(order.status)}</td>
                  <td className="px-8 py-6 text-[12px] text-slate-500 font-black">{order.date}</td>
                  <td className="px-8 py-6 text-right">
                    <span className={`text-sm font-black ${order.status === 'cancelled' ? 'text-slate-300 line-through' : 'text-slate-900 font-black'}`}>
                      {order.total}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                       <button onClick={() => onViewDetail(order.id)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm"><span className="material-icons-round text-xl">visibility</span></button>
                       <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm"><span className="material-icons-round text-xl">edit</span></button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderList;