import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

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
  const [showSN, setShowSN] = useState<string | null>(null);
  const [showPrintLabel, setShowPrintLabel] = useState<any | null>(null);
  const [serialNumbers, setSerialNumbers] = useState<any[]>([]);
  const [snLoading, setSNLoading] = useState(false);

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

      // Build query with optional brand filtering
      let query = supabase
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
            product!inner (
              product_long,
              unit,
              sn_control,
              brand,
              website_id
            )
        `, { count: 'exact' });

      // Filter inventory records by website_id and check product visibility array
      query = query
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .filter('product.website_id', 'cs', `{${APP_CONFIG.WEBSITE_ID}}`);

      const { data, error, count } = await query
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
            sn_control: productInfo?.sn_control || false,
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

  useEffect(() => {
    const fetchSN = async () => {
      if (!showSN) return;
      try {
        setSNLoading(true);
        const { data, error } = await supabase
          .from('serial_tracking')
          .select('*')
          .eq('product_code', showSN);
        
        if (error) throw error;
        setSerialNumbers(data || []);
      } catch (error) {
        console.error("Error fetching S/N:", error);
      } finally {
        setSNLoading(false);
      }
    };
    fetchSN();
  }, [showSN]);

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
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-semibold shadow-sm">
            <span className="material-icons-round text-xs">file_download</span>
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
                <option>Kho A - ESC</option>
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
                    <th className="px-6 py-1.5 border-b border-border-light">Mã SKU</th>
                    <th className="px-6 py-1.5 border-b border-border-light">Tên Sản Phẩm</th>
                    <th className="px-6 py-1.5 border-b border-border-light text-center">ĐVT</th>
                    <th className="px-6 py-1.5 border-b border-border-light text-right">Tồn đầu</th>
                    <th className="px-6 py-1.5 border-b border-border-light text-right text-emerald-700">Tổng Nhập</th>
                    <th className="px-6 py-1.5 border-b border-border-light text-right text-rose-700">Tổng Xuất</th>
                    <th className="px-6 py-1.5 border-b border-border-light text-right text-primary bg-primary/5">Tồn cuối</th>
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
                      <tr key={idx} className={`hover:bg-primary/5 transition-colors group cursor-pointer ${row.alert ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-6 py-1.5 font-mono text-xs text-primary font-bold">
                          <div className="flex items-center gap-2">
                            {row.sn_control && (
                              <span className="material-icons-round text-primary text-[14px]" title="Có quản lý S/N">qr_code</span>
                            )}
                            {formatValue(row.sku)}
                          </div>
                        </td>
                        <td className="px-6 py-1.5 font-bold text-slate-700 text-[13px]">{formatValue(row.name)}</td>
                        <td className="px-6 py-1.5 text-center text-slate-500 text-xs font-semibold">{formatValue(row.unit)}</td>
                        <td className="px-6 py-1.5 text-right font-bold text-slate-600">{formatNumber(row.start)}</td>
                        <td className="px-6 py-1.5 text-right font-bold text-emerald-600">{row.in > 0 ? `+${formatNumber(row.in)}` : '0'}</td>
                        <td className="px-6 py-1.5 text-right font-bold text-rose-600">{row.out > 0 ? `-${formatNumber(row.out)}` : '0'}</td>
                        <td className={`px-6 py-1.5 text-right font-extrabold ${row.alert ? 'text-rose-600' : 'text-primary bg-primary/5'}`}>
                          <div className="flex items-center justify-end gap-2">
                            {formatNumber(row.end)}
                            {row.sn_control && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowSN(row.sku); }}
                                className="p-1 hover:bg-primary/10 rounded-md text-primary transition-colors"
                                title="Xem chi tiết S/N"
                              >
                                <span className="material-icons-round text-sm">visibility</span>
                              </button>
                            )}
                          </div>
                        </td>
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
      {/* S/N Details Modal */}
      {showSN && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 shadow-2xl transition-all">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border-light flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="p-1.5 bg-primary/10 rounded-lg">
                  <span className="material-icons-round text-primary">qr_code</span>
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Danh sách Serial Number</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{showSN}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSN(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <span className="material-icons-round text-sm">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {snLoading ? (
                <div className="py-10 text-center">
                  <div className="inline-block w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
                  <p className="text-xs text-slate-500 font-medium">Đang tải danh sách S/N...</p>
                </div>
              ) : serialNumbers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 italic text-sm">
                  Chưa có dữ liệu Serial Number cho sản phẩm này.
                </div>
              ) : (
                <div className="space-y-2">
                   <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-slate-50 rounded-lg text-[10px] uppercase font-extrabold text-slate-400 tracking-widest">
                      <span>Mã Serial</span>
                      <span className="text-right">Trạng thái</span>
                   </div>
                  {serialNumbers.map((sn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border-light hover:border-primary/30 transition-all hover:bg-primary/5 group">
                      <div className="flex items-center gap-3">
                         <div className="flex flex-col">
                            <span className="text-xs font-mono font-bold text-slate-700">{sn.serial_number}</span>
                            <span className="text-[9px] font-mono text-primary font-bold">{sn.product_code_and_sn}</span>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          sn.status === 'available' ? 'bg-emerald-100 text-emerald-600' : 
                          sn.status === 'sold' ? 'bg-blue-100 text-blue-600' : 
                          'bg-rose-100 text-rose-600'
                        }`}>
                          {sn.status === 'available' ? 'TRONG KHO' : 
                           sn.status === 'sold' ? 'ĐÃ BÁN' : 
                           sn.status.toUpperCase()}
                        </span>
                        {sn.po_code && (
                           <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                              <span className="material-icons-round text-[10px]">shopping_cart</span>
                              {sn.po_code}
                           </div>
                        )}
                        {sn.so_code && (
                           <div className="flex items-center gap-1 text-[9px] text-primary font-bold">
                              <span className="material-icons-round text-[10px]">local_shipping</span>
                              {sn.so_code}
                           </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button 
                          onClick={() => setShowPrintLabel(sn)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-primary/20 hover:text-primary transition-all"
                          title="In tem QR"
                        >
                          <span className="material-icons-round text-sm">print</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* QR Label Print Modal */}
      {showPrintLabel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 border-b border-border-light flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <span className="material-icons-round text-primary">print</span>
                Xem trước tem QR
              </h3>
              <button onClick={() => setShowPrintLabel(null)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                <span className="material-icons-round text-sm">close</span>
              </button>
            </div>
            
            <div className="p-10 flex flex-col items-center">
              {/* This is the part that will be printed */}
              <div id="print-label-content" className="bg-white p-6 border-2 border-slate-900 rounded-xl flex flex-col items-center gap-4 w-[250px] shadow-sm">
                <div className="w-full text-center border-b border-slate-100 pb-2 mb-2">
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">KHO ESC WMS</p>
                </div>
                
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${showPrintLabel.product_code_and_sn}`}
                  alt="QR Code"
                  className="w-40 h-40"
                />
                
                <div className="text-center space-y-1 mt-2">
                   <p className="text-[14px] font-black text-slate-900 font-mono tracking-tight">{showPrintLabel.product_code_and_sn}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">S/N: {showPrintLabel.serial_number}</p>
                </div>
              </div>

              <div className="mt-10 w-full space-y-3">
                 <button 
                  onClick={() => {
                    const printContent = document.getElementById('print-label-content');
                    const windowUrl = 'about:blank';
                    const uniqueName = new Date().getTime();
                    const printWindow = window.open(windowUrl, uniqueName.toString(), 'left=50000,top=50000,width=0,height=0');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>In Tem QR</title>
                            <style>
                              @page { size: auto; margin: 0mm; }
                              body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
                              .label { padding: 20px; border: 1px solid #000; display: flex; flex-direction: column; align-items: center; text-align: center; }
                              img { width: 180px; height: 180px; margin: 10px 0; }
                              .header { font-size: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 100%; padding-bottom: 5px; margin-bottom: 5px; }
                              .code { font-size: 14px; font-weight: bold; font-family: monospace; }
                              .sn { font-size: 10px; color: #666; }
                            </style>
                          </head>
                          <body>
                            <div class="label">
                              <div class="header">KHO ESC WMS</div>
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${showPrintLabel.product_code_and_sn}" />
                              <div class="code">${showPrintLabel.product_code_and_sn}</div>
                              <div class="sn">S/N: ${showPrintLabel.serial_number}</div>
                            </div>
                            <script>
                              window.onload = function() {
                                window.print();
                                window.onafterprint = function() { window.close(); };
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                    }
                  }}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200 active:scale-95 text-xs uppercase tracking-widest"
                 >
                    <span className="material-icons-round">print</span>
                    Xác nhận in tem
                 </button>
                 <p className="text-[10px] text-slate-400 text-center font-medium italic">Tem sẽ được in với kích thước chuẩn 50x50mm</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryReport;