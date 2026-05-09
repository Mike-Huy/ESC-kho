import React, { useEffect, useState } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';
import * as XLSX from 'xlsx';

interface Customer {
  id?: number;
  customer_code: string;
  customer_name: string;
  customer_type: string;
  phone: string;
  email: string;
  address: string;
  delivery_address: string;
  province: string;
  district: string;
  tax_code: string;
  contact_person: string;
  debt_limit: number;
  current_debt: number;
  status: string;
  notes: string;
}

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchCustomers = async (page: number) => {
    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Bulk fetch
      let query = supabase
        .from(TABLE('customer'))
        .select('*', { count: 'exact' });

      // Filter by website_id array
      query = query.contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      const { data, error, count } = await query
        .order('customer_code', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        setCustomers(data);
        setTotalCount(count || 0);
      } else {
        // Fallback demo data if database is empty
        const demoCustomers: Customer[] = [
          {
            customer_code: 'KH001',
            customer_name: 'Hệ thống Siêu thị Co.opmart',
            customer_type: 'Bán sỉ / Chuỗi',
            phone: '1900555568',
            email: 'coopmart@saigoncoop.com.vn',
            address: '199-205 Nguyễn Thái Học, Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
            delivery_address: 'Kho tổng Co.opmart Bình Dương, VSIP 1, Thuận An, Bình Dương',
            province: 'Bình Dương',
            district: 'Thuận An',
            tax_code: '0300812128',
            contact_person: 'Nguyễn Văn Đại diện',
            debt_limit: 500000000,
            current_debt: 120000000,
            status: 'active',
            notes: 'Khách hàng VIP, thanh toán gối đầu'
          },
          {
            customer_code: 'KH002',
            customer_name: 'Chuỗi Cửa hàng Tiện lợi Circle K',
            customer_type: 'Bán sỉ / Chuỗi',
            phone: '02836203088',
            email: 'info@circlek.com.vn',
            address: 'Lot II-1, Đường CN1, Nhóm CN II, KCN Tân Bình, Tây Thạnh, Tân Phú, TP. Hồ Chí Minh',
            delivery_address: 'Kho trung tâm Tân Bình, Tân Phú, TP. Hồ Chí Minh',
            province: 'TP. Hồ Chí Minh',
            district: 'Tân Phú',
            tax_code: '0306123456',
            contact_person: 'Phạm Minh Trí',
            debt_limit: 300000000,
            current_debt: 85000000,
            status: 'active',
            notes: 'Giao hàng vào sáng thứ 3 và thứ 5 hàng tuần'
          }
        ];
        setCustomers(demoCustomers);
        setTotalCount(demoCustomers.length);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage);
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
      ["Mã khách hàng (customer_code)", "Tên khách hàng (customer_name)", "Phân loại (customer_type)", "Số điện thoại (phone)", "Email (email)", "Địa chỉ (address)", "Địa chỉ nhận hàng (delivery_address)", "Tỉnh thành (province)", "Quận huyện (district)", "Mã số thuế (tax_code)", "Người liên hệ (contact_person)", "Hạn mức nợ (debt_limit)", "Trạng thái (HOẠT ĐỘNG/NGỪNG)", "Ghi chú (notes)", "Ngày tạo (created_at)"],
      ["KH001", "Hệ thống Siêu thị Co.opmart", "Bán sỉ", "1900555568", "coopmart@saigoncoop.com.vn", "199 Nguyễn Thái Học Q1 TP.HCM", "Kho tổng Bình Dương", "Bình Dương", "Thuận An", "0300812128", "Nguyễn Văn Đại diện", 500000000, "HOẠT ĐỘNG", "Đối tác chiến lược", "01-05-2026"],
      ["KH002", "Chuỗi Cửa hàng Tiện lợi Circle K", "Bán sỉ", "02836203088", "info@circlek.com.vn", "KCN Tân Bình Tân Phú TP.HCM", "Kho Tân Phú", "TP. Hồ Chí Minh", "Tân Phú", "0306123456", "Phạm Minh Trí", 300000000, "HOẠT ĐỘNG", "Giao hàng sỉ định kỳ", "09-05-2026"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MauKhachHang");
    XLSX.writeFile(workbook, "mau_nhap_khach_hang.xlsx");
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
        if (firstCell.includes('customer_code') || firstCell.includes('mã') || firstCell.includes('tên')) {
          startIndex = 1;
        }

        for (let i = startIndex; i < rows.length; i++) {
          const parts = rows[i] || [];
          if (parts.length >= 2) {
            const code = String(parts[0] || '').trim();
            const name = String(parts[1] || '').trim();
            if (code && name) {
              const customer_type = String(parts[2] || 'Bán sỉ').trim();
              const phone = String(parts[3] || '').trim();
              const email = String(parts[4] || '').trim();
              const address = String(parts[5] || '').trim();
              const delivery_address = String(parts[6] || '').trim();
              const province = String(parts[7] || '').trim();
              const district = String(parts[8] || '').trim();
              const tax_code = String(parts[9] || '').trim();
              const contact_person = String(parts[10] || '').trim();
              const debt_limit = parseFloat(String(parts[11] || '0').replace(/[^0-9.]/g, '')) || 0;
              const status_str = String(parts[12] || '').trim().toUpperCase();
              const status = status_str === 'NGỪNG' || status_str === 'INACTIVE' ? 'inactive' : 'active';
              const notes = String(parts[13] || '').trim();
              const created_at_val = parts[14];
              const parsedDate = parseExcelDate(created_at_val);

              parsedRows.push({
                customer_code: code,
                customer_name: name,
                customer_type,
                phone,
                email,
                address,
                delivery_address,
                province,
                district,
                tax_code,
                contact_person,
                debt_limit,
                current_debt: 0,
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
        console.error('Error importing customers file:', err);
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
        customer_code: row.customer_code,
        customer_name: row.customer_name,
        customer_type: row.customer_type,
        phone: row.phone,
        email: row.email,
        address: row.address,
        delivery_address: row.delivery_address,
        province: row.province,
        district: row.district,
        tax_code: row.tax_code,
        contact_person: row.contact_person,
        debt_limit: row.debt_limit,
        current_debt: 0,
        status: row.status,
        notes: row.notes,
        ...(row.created_at ? { created_at: row.created_at } : {}),
        website_id: [APP_CONFIG.WEBSITE_ID]
      }));

      const { error } = await supabase
        .from(TABLE('customer'))
        .upsert(rowsToUpsert, { onConflict: 'customer_code' });

      if (error) throw error;

      alert(`Đã nhập thành công ${rowsToUpsert.length} khách hàng vào hệ thống!`);
      setShowImportModal(false);
      fetchCustomers(currentPage);
    } catch (err: any) {
      console.error('Error saving customers:', err);
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
              <span className="text-primary font-bold">Khách hàng</span>
            </nav>
            <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
              <span className="p-2 bg-primary/10 rounded-lg">
                <span className="material-icons-round text-primary">people_alt</span>
              </span>
              Danh mục Khách hàng
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
              title="Nhập danh sách khách hàng từ file Excel/CSV"
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
            <h3 className="font-bold text-slate-800 text-sm">Danh sách đối tác mua hàng</h3>
            <span className="text-xs text-slate-400 font-medium">
              Tổng cộng: {totalCount} khách hàng
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Đang tải danh sách khách hàng...</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-extrabold border-b border-border-light">
                      <th className="px-6 py-2">Mã KH</th>
                      <th className="px-6 py-2">Tên Khách Hàng</th>
                      <th className="px-6 py-2">Số điện thoại</th>
                      <th className="px-6 py-2">Mã số thuế</th>
                      <th className="px-6 py-2 text-right">Hạn mức nợ</th>
                      <th className="px-6 py-2 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((customer, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-1 font-mono text-xs text-primary font-bold">
                          {customer.customer_code}
                        </td>
                        <td className="px-6 py-1">
                          <div className="font-bold text-slate-700 text-[13px]">{customer.customer_name}</div>
                          <div className="text-[11px] text-slate-400 font-semibold">{customer.address}</div>
                        </td>
                        <td className="px-6 py-1 text-slate-500 text-xs font-semibold">
                          {customer.phone || '---'}
                        </td>
                        <td className="px-6 py-1 text-slate-500 text-xs font-semibold">
                          {customer.tax_code || '---'}
                        </td>
                        <td className="px-6 py-1 text-right font-black text-slate-900 text-xs">
                          {customer.debt_limit.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-6 py-1 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            customer.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {customer.status === 'active' ? 'HOẠT ĐỘNG' : 'NGỪNG'}
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
                  <span className="material-icons-round">people_alt</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Kiểm tra Khách Hàng Nhập File</h3>
                  <p className="text-slate-500 text-xs font-medium">Xem trước và chuẩn bị lưu đối tác mua hàng vào cơ sở dữ liệu</p>
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
                  <p className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">Tổng số khách hàng</p>
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
                      <th className="p-3">Mã KH</th>
                      <th className="p-3">Tên khách hàng</th>
                      <th className="p-3">Số điện thoại</th>
                      <th className="p-3">Phân loại</th>
                      <th className="p-3">Tỉnh thành</th>
                      <th className="p-3 text-right">Hạn mức nợ</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-primary">{row.customer_code}</td>
                        <td className="p-3 text-slate-800 font-bold max-w-[220px] truncate">{row.customer_name}</td>
                        <td className="p-3 text-slate-600 font-semibold">{row.phone || '---'}</td>
                        <td className="p-3 text-slate-500 font-medium">{row.customer_type || '---'}</td>
                        <td className="p-3 text-slate-500 font-medium">{row.province || '---'}</td>
                        <td className="p-3 text-right text-slate-900 font-bold">{row.debt_limit.toLocaleString('vi-VN')} đ</td>
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
                Xác nhận lưu ({importPreview.length} khách hàng)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerList;
