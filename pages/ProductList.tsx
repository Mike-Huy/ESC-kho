import React, { useEffect, useState } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';
import * as XLSX from 'xlsx';

interface Product {
  id: number;
  product_code: string;
  product_long: string;
  unit: string;
  sn_control: boolean;
  status: boolean;
}

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ codes: string[] } | null>(null);

  const parseExcelDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) {
      return val.toISOString();
    }
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString();
    }
    const str = String(val).trim();
    if (!str) return undefined;
    
    // Support dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy by normalizing separators to '/'
    const cleanStr = str.replace(/[-.]/g, '/');
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const fullYear = y < 100 ? 2000 + y : y;
        const date = new Date(fullYear, m, d);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
    return undefined;
  };

  const downloadTemplate = () => {
    const data = [
      ["Mã SKU (product_code)", "Tên sản phẩm đầy đủ (product_long)", "Tên viết tắt (product_short)", "Thương hiệu (brand)", "Danh mục (category)", "Đơn vị tính (unit)", "Quản lý S/N (CÓ/KHÔNG)", "Giá vốn (cost_price)", "Giá bán (sell_price)", "Thuế suất (%) (tax_rate)", "Trạng thái (HOẠT ĐỘNG/NGỪNG)", "Ghi chú (notes)", "Ngày tạo (created_at)"],
      ["SP001", "Sữa tươi tiệt trùng Vinamilk 1L", "Sữa Vinamilk 1L", "Vinamilk", "Sữa bỉm", "Hộp", "KHÔNG", 25000, 32000, 10, "HOẠT ĐỘNG", "Hàng bán chạy", "01-05-2026"],
      ["SP002", "Điện thoại iPhone 15 Pro Max 256GB", "iPhone 15 Pro Max", "Apple", "Điện tử", "Cái", "CÓ", 28500000, 33990000, 10, "HOẠT ĐỘNG", "Hàng giá trị cao", "09-05-2026"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MauSanPham");
    XLSX.writeFile(workbook, "mau_nhap_san_pham.xlsx");
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBytes = evt.target?.result;
        if (!dataBytes) return;

        const workbook = XLSX.read(dataBytes, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
        if (rows.length === 0) {
          alert('Tải file không thành công hoặc file trống!');
          return;
        }

        const parsedRows: any[] = [];
        let startIndex = 0;
        const firstRow = rows[0] || [];
        const firstCell = String(firstRow[0] || '').toLowerCase();
        if (firstCell.includes('sku') || firstCell.includes('mã') || firstCell.includes('product_code') || firstCell.includes('tên')) {
          startIndex = 1;
        }

        for (let i = startIndex; i < rows.length; i++) {
          const parts = rows[i] || [];
          if (parts.length >= 2) {
            const code = String(parts[0] || '').trim();
            const name = String(parts[1] || '').trim();
            if (code && name) {
              const short = String(parts[2] || '').trim();
              const brand = String(parts[3] || '').trim();
              const category = String(parts[4] || '').trim();
              const unit = String(parts[5] || 'Cái').trim();
              const sn_str = String(parts[6] || '').trim().toUpperCase();
              const sn_control = sn_str === 'CÓ' || sn_str === 'CO' || sn_str === 'YES' || sn_str === 'TRUE' || sn_str === '1';
              const cost_price = parseFloat(String(parts[7] || '0').replace(/[^0-9.]/g, '')) || 0;
              const sell_price = parseFloat(String(parts[8] || '0').replace(/[^0-9.]/g, '')) || 0;
              const tax_rate = parseFloat(String(parts[9] || '0').replace(/[^0-9.]/g, '')) || 0;
              const status_str = String(parts[10] || '').trim().toUpperCase();
              const status = status_str === 'NGỪNG' || status_str === 'NGUNG' || status_str === 'INACTIVE' ? 'inactive' : 'active';
              const notes = String(parts[11] || '').trim();
              const created_at_val = parts[12];
              const parsedDate = parseExcelDate(created_at_val);

              parsedRows.push({
                product_code: code,
                product_long: name,
                product_short: short,
                brand,
                category,
                unit,
                sn_control,
                cost_price,
                sell_price,
                tax_rate,
                status,
                notes,
                created_at: parsedDate,
                isValid: true
              });
            }
          }
        }

        if (parsedRows.length === 0) {
          alert('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng tải file mẫu để xem định dạng!');
          return;
        }

        // Detect trùng product_code TRONG FILE
        const seen = new Map<string, number>();
        const dupCodes: string[] = [];
        for (const row of parsedRows) {
          const c = row.product_code;
          seen.set(c, (seen.get(c) || 0) + 1);
        }
        for (const [code, count] of seen.entries()) {
          if (count > 1) dupCodes.push(code);
        }

        if (dupCodes.length > 0) {
          // Dừng lại — hiện cảnh báo, KHÔNG mở preview
          setDuplicateWarning({ codes: dupCodes });
          return;
        }

        setImportPreview(parsedRows);
        setShowImportModal(true);
      } catch (err: any) {
        console.error('Error importing file:', err);
        alert(`Lỗi khi đọc file: ${err.message}`);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    try {
      setLoading(true);

      const rowsToUpsert = importPreview.map(row => ({
        product_code: row.product_code,
        product_long: row.product_long,
        product_short: row.product_short,
        brand: row.brand,
        category: row.category,
        unit: row.unit,
        sn_control: row.sn_control,
        cost_price: row.cost_price,
        sell_price: row.sell_price,
        tax_rate: row.tax_rate,
        status: row.status,
        notes: row.notes,
        ...(row.created_at ? { created_at: row.created_at } : {}),
        website_id: [APP_CONFIG.WEBSITE_ID]
      }));

      // Upsert theo batch 100 dòng tránh timeout
      const BATCH_SIZE = 100;
      for (let i = 0; i < rowsToUpsert.length; i += BATCH_SIZE) {
        const batch = rowsToUpsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from(TABLE('product'))
          .upsert(batch, { onConflict: 'product_code' });
        if (error) throw error;
      }

      alert(`Đã nhập thành công ${rowsToUpsert.length} sản phẩm vào cơ sở dữ liệu!`);
      setShowImportModal(false);
      fetchProducts(currentPage);
    } catch (err: any) {
      console.error('Error saving imported products:', err);
      alert(`Lỗi khi lưu dữ liệu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (page: number) => {
    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from(TABLE('product'))
        .select('id, product_code, product_long, unit, sn_control, status', { count: 'exact' });

      // Filter by website_id property (now an array)
      query = query.contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      const { data, error, count } = await query
        .order('product_code', { ascending: true })
        .range(from, to);

      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  const toggleSNControl = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from(TABLE('product'))
        .update({ sn_control: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setProducts(products.map(p => p.id === id ? { ...p, sn_control: !currentStatus } : p));
    } catch (error) {
      console.error('Error toggling S/N control:', error);
      alert('Không thể cập nhật trạng thái S/N. Vui lòng thử lại.');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <div className="p-6 lg:p-10 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
              <span>Danh mục</span>
              <span className="material-icons-round text-xs">chevron_right</span>
              <span className="text-primary font-bold">Sản phẩm</span>
            </nav>
            <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
              <span className="p-2 bg-primary/10 rounded-lg">
                <span className="material-icons-round text-primary">inventory_2</span>
              </span>
              Danh mục Sản phẩm
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Excel Template Button */}
            <button 
              onClick={downloadTemplate}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:border-slate-300"
              title="Tải tệp mẫu Excel/CSV để nhập liệu"
            >
              <span className="material-icons-round text-sm text-emerald-600">file_download</span>
              <span>Excel Template</span>
            </button>
            
            {/* Excel Import Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              title="Nhập danh sách sản phẩm từ file Excel/CSV"
            >
              <span className="material-icons-round text-sm">file_upload</span>
              <span>Excel Import</span>
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileImport} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
          </div>
        </header>

      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-light flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Danh sách sản phẩm</h3>
          <span className="text-xs text-slate-400 font-medium">
            Tổng cộng: {totalCount} sản phẩm
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Đang tải danh sách sản phẩm...</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-extrabold border-b border-border-light">
                    <th className="px-6 py-2">Mã SKU</th>
                    <th className="px-6 py-2">Tên Sản Phẩm</th>
                    <th className="px-6 py-2 text-center">ĐVT</th>
                    <th className="px-6 py-2 text-center">Quản lý S/N</th>
                    <th className="px-6 py-2 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-0.5 font-mono text-xs text-primary font-bold">
                        {product.product_code}
                      </td>
                      <td className="px-6 py-0.5 max-w-[400px]">
                        <div className="font-bold text-slate-700 text-[13px] leading-tight py-0.5 truncate" title={product.product_long}>{product.product_long}</div>
                      </td>
                      <td className="px-6 py-0.5 text-slate-500 text-xs font-semibold">
                        {product.unit}
                      </td>
                      <td className="px-6 py-0.5 text-center">
                        <div className="flex flex-col items-center justify-center -space-y-0.5 py-0.5">
                          <button
                            onClick={() => toggleSNControl(product.id, product.sn_control)}
                            className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              product.sn_control ? 'bg-primary' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                product.sn_control ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <div className={`text-[9px] font-bold leading-none ${product.sn_control ? 'text-primary' : 'text-slate-400'}`}>
                            {product.sn_control ? 'S/N' : 'TẮT'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-0.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          product.status ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {product.status ? 'HOẠT ĐỘNG' : 'NGỪNG'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 bg-slate-50 border-t border-border-light flex items-center justify-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="material-icons-round text-sm">chevron_left</span>
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold ${
                        currentPage === i + 1 
                          ? 'bg-primary text-white' 
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="material-icons-round text-sm">chevron_right</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      {/* Popup cảnh báo trùng mã SKU trong file */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <span className="material-icons-round">warning</span>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Phát hiện mã SKU trùng!</h3>
                <p className="text-amber-700 text-xs font-medium mt-0.5">File có {duplicateWarning.codes.length} mã xuất hiện nhiều hơn 1 lần</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-600 text-sm font-medium">Các mã SKU bị trùng trong file:</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {duplicateWarning.codes.map(code => (
                    <span key={code} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-mono font-bold text-xs border border-amber-200">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Vui lòng kiểm tra lại file Excel, xóa các dòng trùng rồi import lại.
              </p>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDuplicateWarning(null)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <span className="material-icons-round text-sm">close</span>
                Đóng & Import lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel/CSV Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-icons-round">file_upload</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Kiểm tra Danh sách Sản phẩm Nhập File</h3>
                  <p className="text-slate-500 text-xs font-medium">Xem trước và chuẩn bị lưu trữ sản phẩm vào hệ thống</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
              >
                <span className="material-icons-round text-lg">close</span>
              </button>
            </div>

            {/* Modal Body: Stats & Table */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Quick stats cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <p className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Tổng số dòng sản phẩm</p>
                  <p className="text-slate-900 text-2xl font-black mt-1">{importPreview.length}</p>
                </div>
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center">
                  <p className="text-emerald-600/70 text-xs font-extrabold uppercase tracking-wider">Hợp lệ (Sẵn sàng lưu)</p>
                  <p className="text-emerald-700 text-2xl font-black mt-1">
                    {importPreview.filter(x => x.isValid).length}
                  </p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-3">Mã SKU</th>
                      <th className="p-3">Tên sản phẩm</th>
                      <th className="p-3">Thương hiệu</th>
                      <th className="p-3">Danh mục</th>
                      <th className="p-3 text-center">ĐVT</th>
                      <th className="p-3 text-center">S/N Control</th>
                      <th className="p-3 text-right">Giá bán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-primary">{row.product_code}</td>
                        <td className="p-3 text-slate-800 font-bold max-w-[200px] truncate">{row.product_long}</td>
                        <td className="p-3 text-slate-500 font-medium">{row.brand || '---'}</td>
                        <td className="p-3 text-slate-500 font-medium">{row.category || '---'}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{row.unit}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${row.sn_control ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                            {row.sn_control ? 'BẬT (S/N)' : 'TẮT'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {row.sell_price.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmImport}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
              >
                <span className="material-icons-round text-sm">check_circle</span>
                Xác nhận lưu ({importPreview.length} sản phẩm)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductList;
