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
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'mock'>('real');
  
  // State quản lý bộ lọc ngày - Mặc định theo yêu cầu của bạn
  const [dateRange, setDateRange] = useState("01/02/2026 - 12/02/2026");

  const processData = (rawData: any[]) => {
    const uniqueSkus = Array.from(new Set(rawData.map((item: any) => item.sku)));
          
    const aggregatedReport: InventoryItem[] = uniqueSkus.map((sku: any) => {
        // Lấy tất cả dòng dữ liệu của SKU này
        const items = rawData.filter((i: any) => i.sku === sku);
        
        // Lấy thông tin cơ bản từ dòng đầu tiên tìm thấy
        const info = items[0];

        // Tính Tổng Nhập và Tổng Xuất trong kỳ
        const totalIn = items.reduce((sum: number, item: any) => sum + (item.import_qty || 0), 0);
        const totalOut = items.reduce((sum: number, item: any) => sum + (item.export_qty || 0), 0);

        // Xác định Tồn Cuối (Closing Stock) từ ngày mới nhất
        const sortedByDateDesc = [...items].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestRecord = sortedByDateDesc[0];
        const endStock = latestRecord.closing_stock;

        // Tính ngược lại Tồn Đầu (Opening Stock)
        // Công thức: Tồn Đầu = Tồn Cuối - (Tổng Nhập - Tổng Xuất)
        // => Tồn Đầu = Tồn Cuối - Tổng Nhập + Tổng Xuất
        const startStock = endStock - totalIn + totalOut;

        return {
          sku: sku,
          name: info.product_name,
          unit: info.unit,
          start: startStock,
          in: totalIn,
          out: totalOut,
          end: endStock,
          alert: endStock < 10 // Cảnh báo nếu tồn kho dưới 10
        };
    });
    
    // Sắp xếp theo tên sản phẩm
    return aggregatedReport.sort((a, b) => a.name.localeCompare(b.name));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const startDate = '2026-02-01';
        const endDate = '2026-02-12';

        // 1. Thử lấy dữ liệu từ Supabase
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (error) {
            console.warn("Supabase fetch error (likely RLS), falling back to mock data:", error);
            throw error;
        }

        if (data && data.length > 0) {
          setDataSource('real');
          setProducts(processData(data));
        } else {
           // Nếu Supabase trả về rỗng (có thể do bảng trống hoặc RLS chặn), dùng dữ liệu mẫu
           console.log("No data from Supabase, using mock data.");
           setDataSource('mock');
           setProducts(processData(MOCK_RAW_DATA));
        }
      } catch (error) {
        // Lỗi kết nối, dùng dữ liệu mẫu
        setDataSource('mock');
        setProducts(processData(MOCK_RAW_DATA));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Tính toán các chỉ số tổng hợp cho Header
  const totalImport = products.reduce((acc, curr) => acc + curr.in, 0);
  const totalExport = products.reduce((acc, curr) => acc + curr.out, 0);
  const totalStock = products.reduce((acc, curr) => acc + curr.end, 0);

  return (
    <div className="p-6 lg:p-10 space-y-8">
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
          <p className="text-sm text-slate-500 mt-1 font-medium italic">
             Dữ liệu từ bảng <code className="bg-slate-100 px-1 rounded font-bold">inventory</code> (01/02/2026 - 12/02/2026)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm">
            <span className="material-icons-round text-sm">file_download</span>
            Xuất Excel
          </button>
          <button className="p-2.5 border border-border-light bg-white rounded-lg text-slate-500 hover:text-primary transition-colors shadow-sm">
            <span className="material-icons-round">settings</span>
          </button>
        </div>
      </header>

      {/* Filters and Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-white border border-border-light p-6 rounded-xl space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-md shadow-sm transition-all">Toàn kho</button>
              <button className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-primary transition-all">Theo khách hàng</button>
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 text-sm">calendar_today</span>
              <input 
                className="w-full pl-10 pr-4 py-2 bg-white border border-border-light rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold" 
                type="text" 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                readOnly
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 text-sm">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-white border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Tìm SKU, tên sản phẩm..." type="text" />
            </div>
            <div className="relative">
              <select className="w-full pl-3 pr-10 py-2 bg-white border border-border-light rounded-lg text-sm text-slate-700 outline-none focus:ring-1 focus:ring-primary appearance-none font-medium">
                <option>Tất cả kho</option>
                <option>Kho A - Sài Gòn</option>
                <option>Kho B - Bình Dương</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 pointer-events-none">expand_more</span>
            </div>
            <button className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-all border border-primary/20">Áp dụng bộ lọc</button>
          </div>
        </div>
        <div className="xl:col-span-4 grid grid-cols-2 gap-4">
          <div className="bg-white border border-border-light p-4 rounded-xl shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-1">Tổng Nhập (Kỳ)</p>
            <p className="text-2xl font-extrabold text-emerald-600">{totalImport.toLocaleString()}</p>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-medium">
              <span className="material-icons-round text-[12px] text-emerald-600">trending_up</span>
              <span>Theo dữ liệu thực tế</span>
            </div>
          </div>
          <div className="bg-white border border-border-light p-4 rounded-xl shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-1">Tổng Xuất (Kỳ)</p>
            <p className="text-2xl font-extrabold text-rose-600">{totalExport.toLocaleString()}</p>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-medium">
              <span className="material-icons-round text-[12px] text-rose-600">trending_down</span>
              <span>Theo dữ liệu thực tế</span>
            </div>
          </div>
          <div className="bg-white border border-border-light p-4 rounded-xl col-span-2 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-1">Tổng Tồn Cuối Kỳ</p>
              <p className="text-2xl font-extrabold text-primary">
                {totalStock.toLocaleString()} <span className="text-sm font-medium text-slate-400 ml-1">đơn vị</span>
              </p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-icons-round text-primary">warehouse</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-slate-800">
            <span className="w-2 h-2 bg-primary rounded-full"></span> Chi tiết biến động kho
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-medium">Hiển thị {products.length} dòng dữ liệu</span>
            <div className="flex gap-1">
              <button className="p-1 hover:bg-slate-100 rounded text-slate-400"><span className="material-icons-round">chevron_left</span></button>
              <button className="p-1 hover:bg-slate-100 rounded text-slate-400"><span className="material-icons-round">chevron_right</span></button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Đang tải dữ liệu báo cáo từ server...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-primary text-[10px] uppercase tracking-widest font-extrabold">
                  <th className="px-6 py-4 border-b border-border-light">Mã SKU</th>
                  <th className="px-6 py-4 border-b border-border-light">Tên Sản Phẩm</th>
                  <th className="px-6 py-4 border-b border-border-light text-center">ĐVT</th>
                  <th className="px-6 py-4 border-b border-border-light text-right">Tồn đầu</th>
                  <th className="px-6 py-4 border-b border-border-light text-right text-emerald-700">Tổng Nhập</th>
                  <th className="px-6 py-4 border-b border-border-light text-right text-rose-700">Tổng Xuất</th>
                  <th className="px-6 py-4 border-b border-border-light text-right text-primary bg-primary/5">Tồn cuối</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {products.length === 0 ? (
                   <tr>
                     <td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">
                        Không có dữ liệu trong khoảng thời gian này hoặc bảng 'inventory' chưa có dữ liệu.
                     </td>
                   </tr>
                ) : (
                  products.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.alert ? 'border-l-4 border-rose-500 bg-rose-50/30' : ''}`}>
                      <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{row.sku}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{row.name}</td>
                      <td className="px-6 py-4 text-center text-slate-500 text-xs font-medium">{row.unit}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">{row.start.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">{row.in > 0 ? `+${row.in}` : '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600">{row.out > 0 ? `-${row.out}` : '-'}</td>
                      <td className={`px-6 py-4 text-right font-extrabold ${row.alert ? 'text-rose-600 bg-rose-50' : 'text-primary bg-primary/5'}`}>{row.end.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryReport;