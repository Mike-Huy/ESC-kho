import React from 'react';

interface OrderDetailProps {
  onBack: () => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ onBack }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header with Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-1">
           <nav className="flex text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
             <button onClick={onBack} className="hover:text-primary transition-colors">Quản lý đơn hàng</button>
             <span className="mx-2">/</span>
             <span className="text-primary">DH-10293</span>
           </nav>
           <div className="flex items-center gap-3">
             <button onClick={onBack} className="md:hidden"><span className="material-icons-round">arrow_back</span></button>
             <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Đơn hàng #DH-10293</h2>
             <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-bold uppercase tracking-wider">Đang đóng gói</span>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm">
             <span className="material-icons-round text-lg">print</span> In nhãn
           </button>
           <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-md shadow-primary/20">
             <span className="material-icons-round text-lg">edit</span> Cập nhật trạng thái
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {/* Info Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-50 rounded-lg"><span className="material-icons-round text-primary text-xl">person</span></div>
                    <h3 className="font-bold text-slate-800">Thông tin khách hàng</h3>
                 </div>
                 <div className="space-y-4">
                    <div>
                       <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Họ và Tên</p>
                       <p className="font-bold text-slate-900">Nguyễn Minh Tuấn</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Điện thoại</p>
                       <p className="font-semibold text-slate-700">+84 901 234 567</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Email</p>
                       <p className="font-semibold text-slate-700">minhtuan.nguyen@email.com</p>
                    </div>
                 </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-50 rounded-lg"><span className="material-icons-round text-primary text-xl">local_shipping</span></div>
                    <h3 className="font-bold text-slate-800">Địa chỉ giao hàng</h3>
                 </div>
                 <div className="space-y-4">
                    <div>
                       <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Người nhận</p>
                       <p className="font-bold text-slate-900">Nguyễn Minh Tuấn</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-1">Địa chỉ chi tiết</p>
                       <p className="font-medium text-slate-700 leading-relaxed text-sm">285 Cách Mạng Tháng 8, Phường 12,<br/> Quận 10, TP. Hồ Chí Minh</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Product List */}
           <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <span className="material-icons-round text-primary">shopping_bag</span>
                    <h3 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Danh sách sản phẩm</h3>
                 </div>
                 <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">02 MẶT HÀNG</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-extrabold border-b border-slate-100">
                       <tr>
                          <th className="px-6 py-4">Sản phẩm</th>
                          <th className="px-6 py-4">SKU</th>
                          <th className="px-6 py-4 text-center">Đơn giá</th>
                          <th className="px-6 py-4 text-center">Số lượng</th>
                          <th className="px-6 py-4 text-right">Tổng cộng</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center p-1">
                                   <img className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDasfp4QGmCo8wg9k8u0F6jPHpDF646maK47kDA33uKuqUEOoHLYdoT_R3zspL2kdcju9rKY9onWMdhh3rZe5p9Y8bw550wBobR6bwK8R7IcGrTJGqGJ2tTxyoHxP2BOZy7li-Y2w5WhO5P84H5-6dlC6sr9vlpCNLdlcivZa6fKtfNT8DPrIA-15ePM2fO9vGb7LMw8wbzaEKB38uBmNLwjsM-tpC2RSF1bInCDl9gl8fPkVrkKpybt3OmISzIH2cNgs5e9lZ2mmke" />
                                </div>
                                <div>
                                   <p className="font-bold text-slate-900 text-sm">Nike Air Max Pro 2024</p>
                                   <p className="text-xs text-slate-400 font-medium mt-0.5">Màu: Đỏ / Size: 42</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5"><span className="px-2 py-1 bg-slate-50 rounded border border-slate-200 text-[10px] font-mono text-slate-600 font-bold">WMS-NK-001</span></td>
                          <td className="px-6 py-5 text-center font-semibold text-slate-700 text-sm">2,450,000 ₫</td>
                          <td className="px-6 py-5 text-center font-bold text-slate-900 text-sm">01</td>
                          <td className="px-6 py-5 text-right font-bold text-slate-900 text-sm">2,450,000 ₫</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-8">
           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-slate-50 rounded-lg"><span className="material-icons-round text-primary text-xl">payments</span></div>
                 <h3 className="font-bold text-slate-800">Thanh toán</h3>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 border-dashed space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Phương thức</span>
                    <span className="text-xs font-bold text-slate-900">NAPAS (Bank Transfer)</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Trạng thái</span>
                    <span className="flex items-center gap-1 text-[11px] font-black text-green-600 uppercase">
                       <span className="material-icons-round text-xs">verified</span> Đã thanh toán
                    </span>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-slate-50 rounded-lg"><span className="material-icons-round text-primary text-xl">history</span></div>
                 <h3 className="font-bold text-slate-800">Lịch sử đơn hàng</h3>
              </div>
              <div className="relative space-y-10 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                 <div className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-4 border-primary z-10 shadow-sm shadow-primary/20"></div>
                    <div className="flex flex-col">
                       <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-primary text-sm uppercase">Đang đóng gói</span>
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase bg-slate-50 px-2 py-0.5 rounded">10:45 AM Nay</span>
                       </div>
                       <p className="text-xs text-slate-600 leading-relaxed">Nhân viên <span className="text-slate-900 font-bold">Lê Văn A</span> đang kiểm hàng và đóng gói tại Line 04.</p>
                    </div>
                 </div>
                 <div className="relative pl-10">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-200 border-2 border-white z-10"></div>
                    <div className="flex flex-col">
                       <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-700 text-sm">Bắt đầu lấy hàng</span>
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase">09:15 AM Nay</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;