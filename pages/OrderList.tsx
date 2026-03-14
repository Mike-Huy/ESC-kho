import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { supabase } from '../supabaseClient';

interface OrderListProps {
  onViewDetail: () => void;
}

// Dữ liệu mẫu Fallback
const MOCK_ORDERS: Order[] = [
  { id: 'ORD-2026-001', customer: 'Nguyễn Minh Tuấn', email: 'tuan.nm@example.com', status: 'processing', date: '10/02/2026', total: '2.450.000 ₫' },
  { id: 'ORD-2026-002', customer: 'Công ty TNHH ABC', email: 'contact@abc-corp.com', status: 'new', date: '11/02/2026', total: '15.600.000 ₫' },
  { id: 'ORD-2026-003', customer: 'Phạm Thị Lan', email: 'lan.pham@example.com', status: 'shipped', date: '09/02/2026', total: '890.000 ₫' },
  { id: 'ORD-2026-004', customer: 'Lê Văn Hùng', email: 'hung.levan@example.com', status: 'cancelled', date: '08/02/2026', total: '3.200.000 ₫' },
  { id: 'ORD-2026-005', customer: 'Tech Solutions Inc', email: 'procurement@techsol.com', status: 'new', date: '12/02/2026', total: '45.000.000 ₫' },
  { id: 'ORD-2026-006', customer: 'Hoàng Văn Nam', email: 'nam.hv@example.com', status: 'shipped', date: '07/02/2026', total: '1.250.000 ₫' },
];

const OrderList: React.FC<OrderListProps> = ({ onViewDetail }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Thử lấy dữ liệu từ Supabase
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedOrders: Order[] = data.map((item: any) => ({
            id: item.order_code,
            customer: item.customer_name,
            email: item.customer_email,
            status: item.status,
            date: new Date(item.created_at).toLocaleDateString('vi-VN'),
            total: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_amount)
          }));
          setOrders(mappedOrders);
          setIsUsingMock(false);
        } else {
           // Nếu bảng rỗng, dùng Mock
           setOrders(MOCK_ORDERS);
           setIsUsingMock(true);
        }
      } catch (error) {
        console.warn('Error fetching orders (using mock):', error);
        setOrders(MOCK_ORDERS);
        setIsUsingMock(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>Mới</span>;
      case 'processing': return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>Đang xử lý</span>;
      case 'shipped': return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>Đã giao hàng</span>;
      case 'cancelled': return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>Đã hủy</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Danh sách Đơn hàng
            {isUsingMock && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-bold uppercase">Demo Data</span>}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Quản lý và vận hành đơn hàng hiệu quả theo thời gian thực.</p>
        </div>
        <button className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95">
          <span className="material-icons-round text-lg">add_circle_outline</span>
          <span>Tạo đơn hàng mới</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 relative">
            <span className="material-icons-round absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm transition-all" placeholder="Tìm theo ID Đơn hàng hoặc Tên Khách hàng..." type="text" />
          </div>
          <div className="lg:col-span-3 relative">
             <span className="material-icons-round absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">filter_list</span>
             <select className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm appearance-none cursor-pointer">
                <option value="">Tất cả trạng thái</option>
                <option value="new">Mới</option>
                <option value="processing">Đang xử lý</option>
                <option value="shipped">Đã giao hàng</option>
             </select>
             <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
          <div className="lg:col-span-3 relative">
              <span className="material-icons-round absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">calendar_today</span>
              <input className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm" placeholder="Chọn khoảng ngày" type="text" />
          </div>
          <div className="lg:col-span-1">
             <button className="w-full h-full border border-slate-200 hover:bg-slate-50 p-2.5 rounded-lg flex items-center justify-center transition-colors text-slate-500 hover:text-primary">
                <span className="material-icons-round">file_download</span>
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Đang tải dữ liệu đơn hàng...</div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">ID Đơn hàng</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Tổng giá trị</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">Chưa có đơn hàng nào</td>
                </tr>
              ) : (
              orders.map((order, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors duration-150">
                  <td className="px-6 py-4 font-bold text-primary">{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{order.customer}</span>
                      <span className="text-xs text-slate-500">{order.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{order.date}</td>
                  <td className={`px-6 py-4 font-bold ${order.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{order.total}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={onViewDetail} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-primary"><span className="material-icons-round text-lg">visibility</span></button>
                       <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-primary"><span className="material-icons-round text-lg">edit</span></button>
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