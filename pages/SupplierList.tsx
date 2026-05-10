import React, { useEffect, useState } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';
import * as XLSX from 'xlsx';

interface Supplier {
  id?: number;
  supplier_code: string;
  supplier_name: string;
  short_name: string;
  tax_code: string;
  phone: string;
  email: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  bank_name: string;
  bank_account: string;
  bank_branch: string;
  payment_terms: number;
  status: string;
  notes: string;
}

const SupplierList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchSuppliers = async (page: number) => {
    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Bulk fetch
      let query = supabase
        .from(TABLE('supplier'))
        .select('*', { count: 'exact' });

      // Filter by website_id array
      query = query.contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      const { data, error, count } = await query
        .order('supplier_code', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        setSuppliers(data);
        setTotalCount(count || 0);
      } else {
        // Fallback demo data if database is empty
        const demoSuppliers: Supplier[] = [
          {
            supplier_code: 'NCC001',
            supplier_name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
            short_name: 'Vinamilk',
            tax_code: '0300588569',
            phone: '02854155555',
            email: 'vinamilk@vinamilk.com.vn',
            address: '10 Tân Trào, Tân Phú, Quận 7, TP. Hồ Chí Minh',
            contact_person: 'Nguyễn Văn A',
            contact_phone: '0901234567',
            bank_name: 'Vietcombank',
            bank_account: '0071001234567',
            bank_branch: 'Kỳ Đồng',
            payment_terms: 30,
            status: 'active',
            notes: 'Nhà cung cấp sữa chính thức'
          },
          {
            supplier_code: 'NCC002',
            supplier_name: 'Công ty TNHH Apple Việt Nam',
            short_name: 'Apple VN',
            tax_code: '0313500350',
            phone: '18001127',
            email: 'contact@apple.com.vn',
            address: 'Phòng 901, Ngôi Nhà Đức, 33 Lê Duẩn, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            contact_person: 'Trần Thị B',
            contact_phone: '0912345678',
            bank_name: 'HSBC',
            bank_account: '1029384756',
            bank_branch: 'Hồ Chí Minh',
            payment_terms: 15,
            status: 'active',
            notes: 'Nhà cung cấp thiết bị điện tử Apple chính hãng'
          }
        ];
        setSuppliers(demoSuppliers);
        setTotalCount(demoSuppliers.length);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(currentPage);
  }, [currentPage]);

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
      ["Mã nhà cung cấp (supplier_code)", "Tên nhà cung cấp (supplier_name)", "Tên viết tắt (short_name)", "Mã số thuế (tax_code)", "Số điện thoại (phone)", "Email (email)", "Địa chỉ (address)", "Người liên hệ (contact_person)", "SĐT liên hệ (contact_phone)", "Tên ngân hàng (bank_name)", "Số tài khoản (bank_account)", "Chi nhánh ngân hàng (bank_branch)", "Điều khoản thanh toán (ngày) (payment_terms)", "Trạng thái (HOẠT ĐỘNG/NGỪNG)", "Ghi chú (notes)", "Ngày tạo (created_at)"],
      ["NCC001", "Công ty Cổ phần Sữa Việt Nam (Vinamilk)", "Vinamilk", "0300588569", "02854155555", "vinamilk@vinamilk.com.vn", "10 Tân Trào Quận 7 TP.HCM", "Nguyễn Văn A", "0901234567", "Vietcombank", "0071001234567", "Kỳ Đồng", 30, "HOẠT ĐỘNG", "Cung cấp mặt hàng sữa bột", "01-05-2026"],
      ["NCC002", "Công ty TNHH Apple Việt Nam", "Apple VN", "0313500350", "18001127", "contact@apple.com.vn", "33 Lê Duẩn Quận 1 TP.HCM", "Trần Thị B", "0912345678", "HSBC", "1029384756", "Hồ Chí Minh", 15, "HOẠT ĐỘNG", "Cung cấp iPad và iPhone", "09-05-2026"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MauNhaCungCap");
    XLSX.writeFile(workbook, "mau_nhap_nha_cung_cap.xlsx");
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
        if (firstCell.includes('supplier_code') || firstCell.includes('mã') || firstCell.includes('tên')) {
          startIndex = 1;
        }

        for (let i = startIndex; i < rows.length; i++) {
          const parts = rows[i] || [];
          if (parts.length >= 2) {
            const code = String(parts[0] || '').trim();
            const name = String(parts[1] || '').trim();
            if (code && name) {
              const short_name = String(parts[2] || '').trim();
              const tax_code = String(parts[3] || '').trim();
              const phone = String(parts[4] || '').trim();
              const email = String(parts[5] || '').trim();
              const address = String(parts[6] || '').trim();
              const contact_person = String(parts[7] || '').trim();
              const contact_phone = String(parts[8] || '').trim();
              const bank_name = String(parts[9] || '').trim();
              const bank_account = String(parts[10] || '').trim();
              const bank_branch = String(parts[11] || '').trim();
              const payment_terms = parseInt(String(parts[12] || '30'), 10) || 30;
              const status_str = String(parts[13] || '').trim().toUpperCase();
              const status = status_str === 'NGỪNG' || status_str === 'INACTIVE' ? 'inactive' : 'active';
              const notes = String(parts[14] || '').trim();
              const created_at_val = parts[15];
              const parsedDate = parseExcelDate(created_at_val);

              parsedRows.push({
                supplier_code: code,
                supplier_name: name,
                short_name,
                tax_code,
                phone,
                email,
                address,
                contact_person,
                contact_phone,
                bank_name,
                bank_account,
                bank_branch,
                payment_terms,
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

        setImportPreview(parsedRows);
        setShowImportModal(true);
      } catch (err: any) {
        console.error('Error importing suppliers file:', err);
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
        supplier_code: row.supplier_code,
        supplier_name: row.supplier_name,
        short_name: row.short_name,
        tax_code: row.tax_code,
        phone: row.phone,
        email: row.email,
        address: row.address,
        contact_person: row.contact_person,
        contact_phone: row.contact_phone,
        bank_name: row.bank_name,
        bank_account: row.bank_account,
        bank_branch: row.bank_branch,
        payment_terms: row.payment_terms,
        status: row.status,
        notes: row.notes,
        ...(row.created_at ? { created_at: row.created_at } : {}),
        website_id: [APP_CONFIG.WEBSITE_ID]
      }));

      const { error } = await supabase
        .from(TABLE('supplier'))
        .upsert(rowsToUpsert, { onConflict: 'supplier_code' });

      if (error) throw error;

      alert(`Đã nhập thành công ${rowsToUpsert.length} nhà cung cấp vào hệ thống!`);
      setShowImportModal(false);
      fetchSuppliers(currentPage);
    } catch (err: any) {
      console.error('Error saving suppliers:', err);
      alert(`Lỗi khi lưu dữ liệu: ${err.message}`);
    } finally {
      setLoading(false);
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
              <span className="text-primary font-bold">Nhà cung cấp</span>
            </nav>
            <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
              <span className="p-2 bg-primary/10 rounded-lg">
                <span className="material-icons-round text-primary">local_shipping</span>
              </span>
              Danh mục Nhà cung cấp
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
              title="Nhập danh sách nhà cung cấp từ file Excel/CSV"
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
            <h3 className="font-bold text-slate-800 text-sm">Danh sách đối tác cung cấp</h3>
            <span className="text-xs text-slate-400 font-medium">
              Tổng cộng: {totalCount} nhà cung cấp
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Đang tải danh sách nhà cung cấp...</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-extrabold border-b border-border-light">
                      <th className="px-6 py-2">Mã NCC</th>
                      <th className="px-6 py-2">Tên Nhà Cung Cấp</th>
                      <th className="px-6 py-2">Số điện thoại</th>
                      <th className="px-6 py-2">Người liên hệ</th>
                      <th className="px-6 py-2 text-center">Điều khoản</th>
                      <th className="px-6 py-2 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.map((supplier, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-0.5 font-mono text-xs text-primary font-bold">
                          {supplier.supplier_code}
                        </td>
                        <td className="px-6 py-0.5">
                          <div className="font-bold text-slate-700 text-[13px] leading-tight py-0.5">{supplier.supplier_name}</div>
                          <div className="text-[11px] text-slate-400 font-semibold leading-tight">{supplier.address}</div>
                        </td>
                        <td className="px-6 py-0.5 text-slate-500 text-xs font-semibold">
                          {supplier.phone || '---'}
                        </td>
                        <td className="px-6 py-0.5 text-slate-500 text-xs font-semibold">
                          <div className="font-semibold leading-tight">{supplier.contact_person || '---'}</div>
                          {supplier.contact_phone && (
                            <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{supplier.contact_phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-0.5 text-center text-slate-700 text-xs font-bold">
                          {supplier.payment_terms} ngày
                        </td>
                        <td className="px-6 py-0.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            supplier.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {supplier.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
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
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Excel/CSV Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-icons-round">local_shipping</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Kiểm tra Nhà Cung Cấp Nhập File</h3>
                  <p className="text-slate-500 text-xs font-medium">Xem trước và chuẩn bị lưu đối tác vào cơ sở dữ liệu</p>
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
                  <p className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Tổng số nhà cung cấp</p>
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
                      <th className="p-3">Mã NCC</th>
                      <th className="p-3">Tên nhà cung cấp</th>
                      <th className="p-3">Số điện thoại</th>
                      <th className="p-3">Mã số thuế</th>
                      <th className="p-3">Người liên hệ</th>
                      <th className="p-3 text-center">Điều khoản</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-primary">{row.supplier_code}</td>
                        <td className="p-3 text-slate-800 font-bold max-w-[220px] truncate">{row.supplier_name}</td>
                        <td className="p-3 text-slate-600 font-semibold">{row.phone || '---'}</td>
                        <td className="p-3 text-slate-500 font-medium">{row.tax_code || '---'}</td>
                        <td className="p-3 text-slate-600 font-bold">{row.contact_person || '---'}</td>
                        <td className="p-3 text-center text-slate-700 font-bold">{row.payment_terms} ngày</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${row.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {row.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG'}
                          </span>
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
                Xác nhận lưu ({importPreview.length} nhà cung cấp)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupplierList;
