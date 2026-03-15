import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface InventoryItem {
  sku: string;
  name: string;
  unit: string;
  start: number;
  in: number;
  out: number;
  end: number;
  alert: boolean;
}

// Dữ liệu mẫu khớp hoàn toàn với câu lệnh SQL bạn đã cung cấp (tháng 2/2026)
// Dùng để hiển thị khi chưa cấu hình xong RLS của Supabase hoặc kết nối mạng lỗi
const MOCK_RAW_DATA = [
  // CPU Intel
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-01', import_qty: 10, export_qty: 5, closing_stock: 55 },
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-02', import_qty: 0, export_qty: 2, closing_stock: 53 },
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-03', import_qty: 20, export_qty: 0, closing_stock: 73 },
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-04', import_qty: 0, export_qty: 10, closing_stock: 63 },
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-05', import_qty: 5, export_qty: 5, closing_stock: 63 },
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-08', import_qty: 30, export_qty: 5, closing_stock: 80 },
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-09', import_qty: 0, export_qty: 15, closing_stock: 65 },
  { sku: 'CPU-INT-001', product_name: 'CPU Intel Core i9-14900K', unit: 'Cái', date: '2026-02-12', import_qty: 0, export_qty: 5, closing_stock: 55 },
  
  // SSD Samsung
  { sku: 'SSD-SAM-980', product_name: 'SSD Samsung 980 Pro 1TB', unit: 'Cái', date: '2026-02-01', import_qty: 50, export_qty: 20, closing_stock: 130 },
  { sku: 'SSD-SAM-980', product_name: 'SSD Samsung 980 Pro 1TB', unit: 'Cái', date: '2026-02-05', import_qty: 0, export_qty: 10, closing_stock: 120 },
  { sku: 'SSD-SAM-980', product_name: 'SSD Samsung 980 Pro 1TB', unit: 'Cái', date: '2026-02-10', import_qty: 20, export_qty: 5, closing_stock: 135 },
  { sku: 'SSD-SAM-980', product_name: 'SSD Samsung 980 Pro 1TB', unit: 'Cái', date: '2026-02-12', import_qty: 0, export_qty: 15, closing_stock: 120 },

  // Carton
  { sku: 'CARTON-A1', product_name: 'Thùng Carton Đóng Gói A1', unit: 'Cái', date: '2026-02-01', import_qty: 500, export_qty: 100, closing_stock: 1400 },
  { sku: 'CARTON-A1', product_name: 'Thùng Carton Đóng Gói A1', unit: 'Cái', date: '2026-02-03', import_qty: 0, export_qty: 200, closing_stock: 1200 },
  { sku: 'CARTON-A1', product_name: 'Thùng Carton Đóng Gói A1', unit: 'Cái', date: '2026-02-09', import_qty: 300, export_qty: 100, closing_stock: 1250 },
  { sku: 'CARTON-A1', product_name: 'Thùng Carton Đóng Gói A1', unit: 'Cái', date: '2026-02-12', import_qty: 0, export_qty: 250, closing_stock: 1000 },

  // Nike
  { sku: 'WMS-NK-001', product_name: 'Nike Air Max Pro 2024', unit: 'Đôi', date: '2026-02-01', import_qty: 0, export_qty: 2, closing_stock: 18 },
  { sku: 'WMS-NK-001', product_name: 'Nike Air Max Pro 2024', unit: 'Đôi', date: '2026-02-04', import_qty: 10, export_qty: 1, closing_stock: 27 },
  { sku: 'WMS-NK-001', product_name: 'Nike Air Max Pro 2024', unit: 'Đôi', date: '2026-02-12', import_qty: 5, export_qty: 2, closing_stock: 25 },

  // Laptop
  { sku: 'LAPTOP-Z2', product_name: 'Laptop Workstation Z2', unit: 'Bộ', date: '2026-02-01', import_qty: 0, export_qty: 1, closing_stock: 4 },
  { sku: 'LAPTOP-Z2', product_name: 'Laptop Workstation Z2', unit: 'Bộ', date: '2026-02-06', import_qty: 2, export_qty: 0, closing_stock: 6 },
  { sku: 'LAPTOP-Z2', product_name: 'Laptop Workstation Z2', unit: 'Bộ', date: '2026-02-12', import_qty: 0, export_qty: 1, closing_stock: 5 },
];

const InventoryReport: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'mock'>('real');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;
  
  // State quản lý bộ lọc ngày - Mặc định theo yêu cầu của bạn
  const [dateRange, setDateRange] = useState("Dữ liệu hiện tại (Thời gian thực)");

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "N/A";
    return value;
  };

  const formatNumber = (value: any) => {
    if (value === null || value === undefined) return "N/A";
    return Number(value).toLocaleString();
  };

  const fetchData = async (page: number) => {
    try {
      setLoading(true);
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Lấy dữ liệu từ bảng inventory của Supabase
      // Kết hợp với bảng product để lấy tên sản phẩm và ĐVT (unit)
      const { data, error, count } = await supabase
        .from('inventory')
        .select(`
          id,
          product_code,
          start_qty,
          received_qty,
          delivered_qty,
          intransit_qty,
          available_qty,
          trans_date,
          product:product_code (
            product_long,
            unit
          )
        `, { count: 'exact' })
        .order('product_code', { ascending: true })
        .range(from, to);

      if (error) {
          console.warn("Supabase fetch error:", error);
          throw error;
      }

      if (data && data.length > 0) {
        setDataSource('real');
        setTotalCount(count || 0);
        
        // Mapping dữ liệu từ Supabase sang định dạng của component
        const mappedData = data.map(item => {
          const productInfo: any = Array.isArray(item.product) ? item.product[0] : item.product;
          const totalOut = (Number(item.delivered_qty) || 0) + (Number(item.intransit_qty) || 0);
          
          return {
            sku: item.product_code || "N/A",
            name: productInfo?.product_long || "N/A",
            unit: productInfo?.unit || "N/A", // Lấy ĐVT từ bảng product
            start: item.start_qty,
            in: item.received_qty,
            out: totalOut,
            end: item.available_qty,
            alert: (Number(item.available_qty) || 0) < 10
          };
        });
        
        setProducts(mappedData);
      } else {
         console.log("No data from Supabase, using mock data for demo.");
         setDataSource('mock');
         setTotalCount(MOCK_RAW_DATA.length);
         // Simplified mock loading
         setProducts(MOCK_RAW_DATA.slice(0, pageSize).map(item => ({
             sku: item.sku,
             name: item.product_name,
             unit: item.unit,
             start: 0,
             in: item.import_qty,
             out: item.export_qty,
             end: item.closing_stock,
             alert: item.closing_stock < 10
         })));
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  // Tính toán các chỉ số tổng hợp cho Header (Vẫn tính dựa trên dữ liệu hiện hiển thị hoặc cần query riêng nếu muốn tổng thực)
  const totalImport = products.reduce((acc, curr) => acc + (Number(curr.in) || 0), 0);
  const totalExport = products.reduce((acc, curr) => acc + (Number(curr.out) || 0), 0);
  const totalStock = products.reduce((acc, curr) => acc + (Number(curr.end) || 0), 0);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Báo cáo</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Xuất - Nhập - Tồn</span>
          </nav>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
                <span className="p-2 bg-primary/10 rounded-lg">
                <span className="material-icons-round text-primary">inventory</span>
                </span>
                Báo cáo Xuất - Nhập - Tồn
            </h1>
            {dataSource === 'mock' && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded border border-amber-200">
                    Dữ liệu mẫu (Demo)
                </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm">
            <span className="material-icons-round text-sm">file_download</span>
            Xuất ra Excel
          </button>
          <button className="p-2 border border-border-light bg-white rounded-lg text-slate-500 hover:text-primary transition-colors shadow-sm">
            <span className="material-icons-round">settings</span>
          </button>
        </div>
      </header>

      {/* Filters and Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-white border border-border-light p-5 rounded-xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button className="px-5 py-1.5 text-sm font-bold bg-primary text-white rounded-md shadow-sm transition-all">Toàn kho</button>
              <button className="px-5 py-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-all">Theo khách hàng</button>
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 text-sm">calendar_today</span>
              <input 
                className="w-full pl-10 pr-4 py-1.5 bg-white border border-border-light rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold" 
                type="text" 
                value={dateRange}
                readOnly
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 text-sm">search</span>
              <input className="w-full pl-10 pr-4 py-1.5 bg-white border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Tìm SKU, tên sản phẩm..." type="text" />
            </div>
            <div className="relative">
              <select className="w-full pl-3 pr-10 py-1.5 bg-white border border-border-light rounded-lg text-sm text-slate-700 outline-none focus:ring-1 focus:ring-primary appearance-none font-medium">
                <option>Tất cả kho</option>
                <option>Kho A - Sài Gòn</option>
                <option>Kho B - Bình Dương</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 pointer-events-none">expand_more</span>
            </div>
            <button className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-all border border-primary/20">Áp dụng bộ lọc</button>
          </div>
        </div>
        <div className="xl:col-span-4 grid grid-cols-2 gap-4">
          <div className="bg-white border border-border-light p-3 rounded-xl shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-0.5">Tổng Nhập (Trang)</p>
            <p className="text-xl font-extrabold text-emerald-600">{totalImport.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-border-light p-3 rounded-xl shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-0.5">Tổng Xuất (Trang)</p>
            <p className="text-xl font-extrabold text-rose-600">{totalExport.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-border-light p-3 rounded-xl col-span-2 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-0.5">Tổng Tồn Trang Này</p>
              <p className="text-xl font-extrabold text-primary">
                {totalStock.toLocaleString()} <span className="text-xs font-medium text-slate-400 ml-1">đơn vị</span>
              </p>
            </div>
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-icons-round text-primary text-xl">warehouse</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-border-light flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 text-sm">
            <span className="w-2 h-2 bg-primary rounded-full"></span> Chi tiết biến động kho
          </h3>
          <span className="text-xs text-slate-400 font-medium italic">
            Hiển thị dòng {(currentPage-1)*pageSize + 1} - {Math.min(currentPage*pageSize, totalCount)} trên tổng {totalCount}
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-10 text-center text-slate-500">
               <div className="inline-block w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
               <p className="text-sm font-medium">Đang tải dữ liệu...</p>
             </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-table-header text-[10px] uppercase tracking-widest font-extrabold">
                    <th className="px-6 py-3 border-b border-border-light">Mã SKU</th>
                    <th className="px-6 py-3 border-b border-border-light">Tên Sản Phẩm</th>
                    <th className="px-6 py-3 border-b border-border-light text-center">ĐVT</th>
                    <th className="px-6 py-3 border-b border-border-light text-right">Tồn đầu</th>
                    <th className="px-6 py-3 border-b border-border-light text-right text-emerald-700">Tổng Nhập</th>
                    <th className="px-6 py-3 border-b border-border-light text-right text-rose-700">Tổng Xuất</th>
                    <th className="px-6 py-3 border-b border-border-light text-right text-primary bg-primary/5">Tồn cuối</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">
                        Không có dữ liệu trong bảng 'inventory' hoặc chưa có mã sản phẩm tương ứng.
                      </td>
                    </tr>
                  ) : (
                    products.map((row, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50/80 transition-colors group ${row.alert ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-6 py-2.5 font-mono text-xs text-primary font-bold">{formatValue(row.sku)}</td>
                        <td className="px-6 py-2.5 font-bold text-slate-700 text-[13px]">{formatValue(row.name)}</td>
                        <td className="px-6 py-2.5 text-center text-slate-500 text-xs font-semibold">{formatValue(row.unit)}</td>
                        <td className="px-6 py-2.5 text-right font-bold text-slate-600">{formatNumber(row.start)}</td>
                        <td className="px-6 py-2.5 text-right font-bold text-emerald-600">{row.in > 0 ? `+${formatNumber(row.in)}` : '0'}</td>
                        <td className="px-6 py-2.5 text-right font-bold text-rose-600">{row.out > 0 ? `-${formatNumber(row.out)}` : '0'}</td>
                        <td className={`px-6 py-2.5 text-right font-extrabold ${row.alert ? 'text-rose-600' : 'text-primary bg-primary/5'}`}>{formatNumber(row.end)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="p-4 border-t border-border-light bg-slate-50 flex items-center justify-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <span className="material-icons-round text-sm">chevron_left</span>
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Chỉ hiển thị vài trang xung quanh trang hiện tại nếu quá nhiều
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === pageNum 
                              ? 'bg-primary text-white shadow-md shadow-primary/20' 
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <span className="material-icons-round text-sm">chevron_right</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryReport;