import React, { useEffect, useState, useRef } from 'react';
import { Order } from '../types';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';
import * as XLSX from 'xlsx';

interface OrderListProps {
  onViewDetail: (id: string) => void;
  statusFilter?: 'pending_proc' | 'completed' | 'cancelled' | '';
  hideHeader?: boolean;
}

// Dữ liệu mẫu Fallback
const MOCK_ORDERS: Order[] = [
  { id: 'ORD-2026-001', customer: 'Nguyễn Minh Tuấn', email: 'tuan.nm@example.com', status: 'processing', date: '10/02/2026', total: '2.450.000 ₫' },
  { id: 'ORD-2026-002', customer: 'Công ty TNHH ABC', email: 'contact@abc-corp.com', status: 'pending', date: '11/02/2026', total: '15.600.000 ₫' },
  { id: 'ORD-2026-003', customer: 'Phạm Thị Lan', email: 'lan.pham@example.com', status: 'shipped', date: '09/02/2026', total: '890.000 ₫' },
  { id: 'ORD-2026-004', customer: 'Lê Văn Hùng', email: 'hung.levan@example.com', status: 'cancelled', date: '08/02/2026', total: '3.200.000 ₫' },
];

const OrderList: React.FC<OrderListProps> = ({ onViewDetail, statusFilter = '', hideHeader = false }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToastMsg = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, actionLabel: string) => {
    try {
      if (!isUsingMock) {
        const { error } = await supabase
          .from(TABLE('so'))
          .update({ status: newStatus })
          .eq('so_code', orderId);

        if (error) {
          throw error;
        }
      }

      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      showToastMsg(`Đã chuyển đơn ${orderId} sang trạng thái "${actionLabel}" thành công!`, 'success');
    } catch (err: any) {
      console.error('Error updating order status:', err);
      // Fallback update local state anyway
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      showToastMsg(`Đã cập nhật đơn ${orderId} (Chế độ offline)`, 'info');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [groupedImportSOs, setGroupedImportSOs] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const parseExcelDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
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
          return date.toISOString().split('T')[0];
        }
      }
    }
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    return undefined;
  };

  const downloadTemplate = () => {
    const data = [
      [
        "Mã đơn bán (so_code)", 
        "Tên khách hàng (customer_name)", 
        "SĐT khách hàng (customer_phone)", 
        "Địa chỉ giao hàng (delivery_address)", 
        "Ngày đặt hàng (order_date)", 
        "Mã sản phẩm (product_code)", 
        "Số lượng (qty)", 
        "Đơn giá bán (unit_price)"
      ],
      [
        "SO-20260510-001", 
        "Nguyễn Minh Tuấn", 
        "0909123456", 
        "123 Nguyễn Trãi, Q1, TP.HCM", 
        "10-05-2026", 
        "SP001", 
        5, 
        120000
      ],
      [
        "SO-20260510-001", 
        "Nguyễn Minh Tuấn", 
        "0909123456", 
        "123 Nguyễn Trãi, Q1, TP.HCM", 
        "10-05-2026", 
        "SP002", 
        2, 
        250000
      ],
      [
        "SO-20260510-002", 
        "Công ty TNHH ABC", 
        "0283838383", 
        "456 Lê Lợi, Q.Tân Bình, TP.HCM", 
        "09-05-2026", 
        "SP003", 
        10, 
        85000
      ]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MauDonBanSO");
    XLSX.writeFile(workbook, "mau_nhap_don_ban_so.xlsx");
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

        const parsedRows: { 
          so_code: string; 
          customer_name: string; 
          customer_phone: string; 
          delivery_address: string; 
          order_date: string; 
          product_code: string; 
          qty: number; 
          unit_price: number; 
        }[] = [];

        let startIndex = 0;
        const firstRow = rows[0] || [];
        const firstCell = String(firstRow[0] || '').toLowerCase();
        if (
          firstCell.includes('mã') || 
          firstCell.includes('code') || 
          firstCell.includes('sản phẩm') || 
          firstCell.includes('khách') || 
          firstCell.includes('customer')
        ) {
          startIndex = 1;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = startIndex; i < rows.length; i++) {
          const parts = rows[i] || [];
          if (parts.length >= 2) {
            const fileSo = String(parts[0] || '').trim();
            const custName = String(parts[1] || '').trim();
            const custPhone = String(parts[2] || '').trim();
            const delivAddr = String(parts[3] || '').trim();
            
            const rawDate = parts[4];
            const parsedDate = parseExcelDate(rawDate) || todayStr;
            
            const prodCode = String(parts[5] || '').trim();
            const qty = parseInt(String(parts[6] || '1'), 10) || 1;
            const price = parseFloat(String(parts[7] || '0')) || 0;

            if (fileSo && prodCode) {
              parsedRows.push({ 
                so_code: fileSo, 
                customer_name: custName, 
                customer_phone: custPhone, 
                delivery_address: delivAddr, 
                order_date: parsedDate, 
                product_code: prodCode, 
                qty, 
                unit_price: price 
              });
            }
          }
        }

        if (parsedRows.length === 0) {
          alert('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng tải file mẫu để xem định dạng!');
          return;
        }

        // Fetch products information to validate product_code
        const codes = Array.from(new Set(parsedRows.map(r => r.product_code)));
        const { data: dbProducts, error } = await supabase
          .from(TABLE('product'))
          .select('product_code, product_long, unit, sell_price')
          .contains('website_id', [APP_CONFIG.WEBSITE_ID])
          .in('product_code', codes);

        if (error) throw error;

        const dbProductsMap = new Map<string, any>();
        dbProducts?.forEach(p => {
          dbProductsMap.set(p.product_code.toLowerCase(), p);
        });

        // Group rows by so_code
        const groupsMap = new Map<string, any>();
        
        parsedRows.forEach(row => {
          const key = row.so_code;
          const dbProd = dbProductsMap.get(row.product_code.toLowerCase());
          
          let soGroup = groupsMap.get(key);
          if (!soGroup) {
            soGroup = {
              so_code: row.so_code,
              customer_name: row.customer_name || 'Khách vãng lai',
              customer_phone: row.customer_phone || '',
              delivery_address: row.delivery_address || 'Nhận tại kho',
              order_date: row.order_date,
              items: []
            };
            groupsMap.set(key, soGroup);
          }

          if (dbProd) {
            soGroup.items.push({
              product_code: dbProd.product_code,
              qty: row.qty,
              unit_price: row.unit_price || dbProd.sell_price || 0,
              name: dbProd.product_long,
              unit: dbProd.unit,
              isValid: true
            });
          } else {
            soGroup.items.push({
              product_code: row.product_code,
              qty: row.qty,
              unit_price: row.unit_price || 0,
              isValid: false,
              errorMsg: 'Mã sản phẩm không tồn tại'
            });
          }
        });

        const finalGroups = Array.from(groupsMap.values());
        setGroupedImportSOs(finalGroups);
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
      
      const validGroups = groupedImportSOs.map(g => ({
        ...g,
        items: g.items.filter((item: any) => item.isValid)
      })).filter(g => g.items.length > 0);

      if (validGroups.length === 0) {
        alert('Không có đơn hàng bán hoặc sản phẩm nào hợp lệ để nhập!');
        return;
      }

      // Check which so_code already exist in DB to delete/overwrite
      const soCodes = validGroups.map((g: any) => g.so_code);
      const { data: existingSOs } = await supabase
        .from(TABLE('so'))
        .select('so_code')
        .in('so_code', soCodes);
      const existingCodes = new Set((existingSOs || []).map((r: any) => r.so_code));

      // Overwrite duplicate orders
      if (existingCodes.size > 0) {
        const dupList = Array.from(existingCodes) as string[];
        await supabase.from(TABLE('stock_movement')).delete().eq('ref_type', 'SO').in('ref_code', dupList);
        await supabase.from(TABLE('serial_tracking')).update({ so_code: null, status: 'available' }).in('so_code', dupList);
        await supabase.from(TABLE('so_items')).delete().in('so_code', dupList);
        await supabase.from(TABLE('so')).delete().in('so_code', dupList);
      }

      // Save SOs and their details
      for (const group of validGroups) {
        let subtotal = 0;
        group.items.forEach((item: any) => {
          subtotal += item.qty * item.unit_price;
        });
        const total_amount = subtotal;

        const { error: soError } = await supabase
          .from(TABLE('so'))
          .insert([{
            so_code: group.so_code,
            customer_name: group.customer_name,
            customer_phone: group.customer_phone,
            delivery_address: group.delivery_address,
            status: 'pending',
            order_date: group.order_date,
            subtotal,
            total_amount,
            website_id: [APP_CONFIG.WEBSITE_ID]
          }]);

        if (soError) {
          throw new Error(`Lỗi tạo đơn SO ${group.so_code}: ${soError.message}`);
        }

        const soItems = group.items.map((item: any) => ({
          so_code: group.so_code,
          product_code: item.product_code,
          qty: item.qty,
          unit: item.unit || 'Cái',
          unit_price: item.unit_price,
          total_price: item.qty * item.unit_price
        }));
        
        const { error: itemError } = await supabase
          .from(TABLE('so_items'))
          .insert(soItems);
          
        if (itemError) {
          throw new Error(`Lỗi thêm sản phẩm cho đơn SO ${group.so_code}: ${itemError.message}`);
        }
      }

      const overwriteCount = existingCodes.size;
      const newCount = validGroups.length - overwriteCount;
      const msg = overwriteCount > 0
        ? `Nhập file thành công! Đã tạo mới ${newCount} đơn SO, ghi đè ${overwriteCount} đơn trùng.`
        : `Nhập file thành công! Đã tạo ${validGroups.length} đơn hàng SO mới vào hệ thống.`;
      alert(msg);
      setShowImportModal(false);
      setGroupedImportSOs([]);
      fetchOrders();
    } catch (err: any) {
      console.error('Error confirming import:', err);
      alert(err.message || 'Lỗi hệ thống khi lưu đơn SO.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Table is named 'so' (Sales Orders)
      let query = supabase
        .from(TABLE('so'))
        .select(`
          *,
          ${TABLE('so_items')}!inner(
            ${TABLE('product')}!inner(brand, website_id)
          )
        `);

      // Filter by website_id and product visibility
      query = query
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .filter(`${TABLE('so_items')}.${TABLE('product')}.website_id`, 'cs', `{${APP_CONFIG.WEBSITE_ID}}`);

      // Filter by warehouse if user is restricted
      const savedUser = localStorage.getItem('wms_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && !user.isSuperAdmin && user.wh_code) {
          query = query.eq('wh_code', user.wh_code);
        }
      }

      // Filter by statusFilter
      if (statusFilter === 'pending_proc') {
        query = query.in('status', ['pending', 'new', 'processing']);
      } else if (statusFilter === 'completed') {
        query = query.in('status', ['shipped', 'completed']);
      } else if (statusFilter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }

      query = query.order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`so_code.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Filter mock fallback based on statusFilter
      let mockFiltered = MOCK_ORDERS;
      if (statusFilter === 'pending_proc') {
        mockFiltered = MOCK_ORDERS.filter(o => ['pending', 'new', 'processing'].includes(o.status.toLowerCase()));
      } else if (statusFilter === 'completed') {
        mockFiltered = MOCK_ORDERS.filter(o => ['shipped', 'completed'].includes(o.status.toLowerCase()));
      } else if (statusFilter === 'cancelled') {
        mockFiltered = MOCK_ORDERS.filter(o => o.status.toLowerCase() === 'cancelled');
      }

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
          setOrders(mockFiltered);
          setIsUsingMock(true);
        } else {
          setOrders([]);
          setIsUsingMock(false);
        }
      }
    } catch (error) {
      console.warn('Error fetching orders (using mock):', error);
      let mockFiltered = MOCK_ORDERS;
      if (statusFilter === 'pending_proc') {
        mockFiltered = MOCK_ORDERS.filter(o => ['pending', 'new', 'processing'].includes(o.status.toLowerCase()));
      } else if (statusFilter === 'completed') {
        mockFiltered = MOCK_ORDERS.filter(o => ['shipped', 'completed'].includes(o.status.toLowerCase()));
      } else if (statusFilter === 'cancelled') {
        mockFiltered = MOCK_ORDERS.filter(o => o.status.toLowerCase() === 'cancelled');
      }
      setOrders(mockFiltered);
      setIsUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Flow: new → picking → packing → routing → shipped
  const STATUS_FLOW = [
    { value: 'new',      label: 'Mới',             icon: 'inbox',       color: 'blue' },
    { value: 'picking',  label: 'Đang soạn',        icon: 'checklist',   color: 'amber' },
    { value: 'packing',  label: 'Đang đóng gói',    icon: 'inventory_2', color: 'indigo' },
    { value: 'routing',  label: 'Đang sắp tuyến',   icon: 'alt_route',   color: 'purple' },
    { value: 'shipped',  label: 'Đã bàn giao',      icon: 'task_alt',    color: 'emerald' },
  ];

  const getNextStatus = (current: string) => {
    const idx = STATUS_FLOW.findIndex(s => s.value === current);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  };

  const getStatusMeta = (status: string) => {
    const s = status?.toLowerCase();
    
    if (s === 'pending' || s === 'new') {
      return { value: 'new', label: 'MỚI', icon: 'inbox', color: 'blue' };
    }
    if (s === 'picking') {
      return { value: 'picking', label: 'ĐANG SOẠN', icon: 'checklist', color: 'amber' };
    }
    if (s === 'packing' || s === 'processing') {
      return { value: 'packing', label: 'ĐANG ĐÓNG', icon: 'inventory_2', color: 'indigo' };
    }
    if (s === 'routing') {
      return { value: 'routing', label: 'SẮP TUYẾN', icon: 'alt_route', color: 'purple' };
    }
    if (s === 'shipped' || s === 'completed' || s === 'delivered') {
      return { value: 'shipped', label: 'ĐÃ BÀN GIAO', icon: 'task_alt', color: 'emerald' };
    }
    if (s === 'cancelled') {
      return { value: 'cancelled', label: 'ĐÃ HỦY', icon: 'cancel', color: 'slate' };
    }
    
    return { value: status, label: status.toUpperCase(), icon: 'help', color: 'slate' };
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    const meta = getStatusMeta(s);
    
    if (meta.value === 'cancelled') {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-tighter"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>ĐÃ HỦY</span>;
    }
    
    const colorMap: Record<string, string> = {
      blue:    'bg-blue-50 text-blue-600 border-blue-100',
      amber:   'bg-amber-50 text-amber-600 border-amber-100',
      indigo:  'bg-indigo-50 text-indigo-600 border-indigo-100',
      purple:  'bg-purple-50 text-purple-600 border-purple-100',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      slate:   'bg-slate-50 text-slate-500 border-slate-200',
    };
    const dotMap: Record<string, string> = {
      blue: 'bg-blue-500', amber: 'bg-amber-500', indigo: 'bg-indigo-500',
      purple: 'bg-purple-500', emerald: 'bg-emerald-500', slate: 'bg-slate-400',
    };
    const isActive = !['shipped', 'cancelled', 'completed', 'delivered'].includes(meta.value);
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border uppercase tracking-tighter ${colorMap[meta.color] || colorMap.slate}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${dotMap[meta.color] || dotMap.slate} ${isActive ? 'animate-pulse' : ''}`}></span>
        {meta.label}
      </span>
    );
  };

  return (
    <div className={`${hideHeader ? 'p-6 lg:p-10 max-w-7xl' : 'max-w-[1600px] p-6 pt-4'} mx-auto animate-in fade-in duration-500`}>
      {!hideHeader ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               DANH SÁCH ĐƠN HÀNG
            </h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Quản lý và vận hành đơn hàng (SO)</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Excel Template Button */}
            <button 
              onClick={downloadTemplate}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md hover:border-slate-300 uppercase tracking-widest active:scale-95"
              title="Tải tệp mẫu Excel/CSV để nhập liệu"
            >
              <span className="material-icons-round text-base text-emerald-600">file_download</span>
              <span>Excel Template</span>
            </button>
            
            {/* Excel Import Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-5 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-widest active:scale-95"
              title="Nhập danh sách đơn bán từ file Excel/CSV"
            >
              <span className="material-icons-round text-base">file_upload</span>
              <span>Excel Import</span>
            </button>
            
            <button className="bg-primary hover:bg-blue-700 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase text-xs tracking-widest">
              <span className="material-icons-round text-sm">add_circle</span>
              <span>Tạo đơn SO mới</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
          {/* Excel Template Button */}
          <button 
            onClick={downloadTemplate}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md hover:border-slate-300 uppercase tracking-widest active:scale-95"
            title="Tải tệp mẫu Excel/CSV để nhập liệu"
          >
            <span className="material-icons-round text-base text-emerald-600">file_download</span>
            <span>Excel Template</span>
          </button>
          
          {/* Excel Import Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-widest active:scale-95"
            title="Nhập danh sách đơn bán từ file Excel/CSV"
          >
            <span className="material-icons-round text-base">file_upload</span>
            <span>Excel Import</span>
          </button>
          
          <button className="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-xl shadow-primary/20 active:scale-95 uppercase text-xs tracking-widest">
            <span className="material-icons-round text-sm">add_circle</span>
            <span>Tạo đơn SO mới</span>
          </button>
        </div>
      )}

      <div className="bg-white p-3 px-6 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 mb-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-8 relative group">
            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-28 py-2.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary outline-none text-sm font-bold transition-all" 
              placeholder="Tìm theo Mã đơn SO hoặc Tên khách hàng..." 
              type="text" 
            />
            <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-slate-900 text-white rounded-xl px-4 py-1.5 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-sm">
              Tìm kiếm
            </button>
          </div>
          <div className="lg:col-span-3 relative">
             <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">filter_list</span>
             <select className="w-full pl-12 pr-10 py-2.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary outline-none text-sm font-bold appearance-none cursor-pointer transition-all">
                <option value="">Trạng thái</option>
                <option value="pending">Mới (Pending)</option>
                <option value="processing">Đang xử lý</option>
                <option value="shipped">Đã giao hàng</option>
             </select>
             <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
          <div className="lg:col-span-1 flex justify-end">
             <button className="w-10 h-10 border-2 border-slate-100 bg-white hover:bg-slate-50 rounded-xl flex items-center justify-center transition-all text-slate-400 hover:text-primary" title="Tải xuống danh sách">
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
                <th className="px-6 py-2">Mã đơn SO</th>
                <th className="px-6 py-2">Khách hàng</th>
                <th className="px-6 py-2 text-center">Trạng thái</th>
                <th className="px-6 py-2">Ngày đặt hàng</th>
                <th className="px-6 py-2 text-right">Tổng giá trị</th>
                <th className="px-6 py-2 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <span className="material-icons-round text-6xl mb-4">inventory_2</span>
                        <p className="font-black uppercase tracking-widest text-sm">Không có dữ liệu</p>
                      </div>
                   </td>
                </tr>
              ) : (
                orders.map((order, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="px-6 py-0.5 cursor-pointer hover:underline" onClick={() => onViewDetail(order.id)} title="Xem chi tiết đơn hàng">
                      <span className="font-black text-primary hover:text-indigo-600 text-sm tracking-tight leading-none transition-colors">{order.id}</span>
                    </td>
                    <td className="px-6 py-0.5 max-w-[280px]">
                      <div className="font-medium text-slate-600 text-sm leading-none truncate" title={order.customer}>
                        {order.customer}
                      </div>
                    </td>
                    <td className="px-6 py-0.5 text-center">{getStatusBadge(order.status)}</td>
                    <td className="px-6 py-0.5 text-[12px] text-slate-500 font-black leading-none">{order.date}</td>
                    <td className="px-6 py-0.5 text-right">
                      <span className={`text-sm font-medium leading-none ${order.status === 'cancelled' ? 'text-slate-300 line-through' : 'text-slate-800 font-medium'}`}>
                        {order.total}
                      </span>
                    </td>
                    <td className="px-6 py-0.5">
                      <div className="flex items-center justify-center gap-3.5 py-1">
                        {(() => {
                          const status = order.status?.toLowerCase();
                          const isPicking = status === 'picking' || status === 'new' || status === 'pending';
                          const isPacking = status === 'packing' || status === 'processing';
                          const isRouting = status === 'routing';
                          const isShipped = status === 'shipped' || status === 'completed';

                          return (
                            <>
                              {/* 1. Soạn đơn (Picking) */}
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'picking', 'Đang soạn')}
                                className={`transition-all duration-200 hover:scale-125 ${
                                  isPicking 
                                    ? 'text-amber-500 font-bold drop-shadow-sm' 
                                    : 'text-slate-300 opacity-40 hover:opacity-80'
                                }`}
                                title="Soạn đơn (Picking)"
                              >
                                <span className="material-icons-round text-lg">checklist</span>
                              </button>

                              {/* 2. Đóng đơn (Packing) */}
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'packing', 'Đang đóng gói')}
                                className={`transition-all duration-200 hover:scale-125 ${
                                  isPacking 
                                    ? 'text-indigo-500 font-bold drop-shadow-sm' 
                                    : 'text-slate-300 opacity-40 hover:opacity-80'
                                }`}
                                title="Đóng đơn (Packing)"
                              >
                                <span className="material-icons-round text-lg">inventory_2</span>
                              </button>

                              {/* 3. Sắp tuyến (Routing) */}
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'routing', 'Đang sắp tuyến')}
                                className={`transition-all duration-200 hover:scale-125 ${
                                  isRouting 
                                    ? 'text-purple-500 font-bold drop-shadow-sm' 
                                    : 'text-slate-300 opacity-40 hover:opacity-80'
                                }`}
                                title="Sắp tuyến (Routing)"
                              >
                                <span className="material-icons-round text-lg">alt_route</span>
                              </button>

                              {/* 4. Đã bàn giao (Shipped) */}
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'shipped', 'Đã bàn giao')}
                                className={`transition-all duration-200 hover:scale-125 ${
                                  isShipped 
                                    ? 'text-emerald-500 font-bold drop-shadow-sm' 
                                    : 'text-slate-300 opacity-40 hover:opacity-80'
                                }`}
                                title="Đã bàn giao (Shipped)"
                              >
                                <span className="material-icons-round text-lg">task_alt</span>
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Excel/CSV Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-icons-round">file_upload</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Kiểm tra Danh sách Nhập Đơn bán SO</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest text-[9px] mt-0.5">Xem trước và đối soát mã sản phẩm theo từng đơn hàng bán (SO)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
              >
                <span className="material-icons-round text-lg">close</span>
              </button>
            </div>

            {/* Modal Body: Stats & Groups */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              {/* Quick stats cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-150 rounded-2xl text-center shadow-sm">
                  <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Tổng đơn hàng</p>
                  <p className="text-slate-900 text-xl font-black mt-1">{groupedImportSOs.length}</p>
                </div>
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center shadow-sm">
                  <p className="text-emerald-600/70 text-[10px] font-extrabold uppercase tracking-wider">Hợp lệ</p>
                  <p className="text-emerald-700 text-xl font-black mt-1">
                    {groupedImportSOs.filter(g => g.items.every((x: any) => x.isValid)).length} đơn
                  </p>
                </div>
                <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl text-center shadow-sm">
                  <p className="text-rose-600/70 text-[10px] font-extrabold uppercase tracking-wider">Có lỗi mã SP</p>
                  <p className="text-rose-700 text-xl font-black mt-1">
                    {groupedImportSOs.filter(g => g.items.some((x: any) => !x.isValid)).length} đơn
                  </p>
                </div>
              </div>

              {/* List of Grouped SO Cards */}
              <div className="space-y-4">
                {groupedImportSOs.map((group, gIdx) => {
                  const hasError = group.items.some((x: any) => !x.isValid);
                  return (
                    <div key={gIdx} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md ${hasError ? 'border-rose-200' : 'border-slate-150'}`}>
                      {/* Card Header */}
                      <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${hasError ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                          <span className="material-icons-round text-primary text-lg">receipt_long</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-slate-800">{group.so_code}</span>
                              {hasError ? (
                                <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">Có lỗi</span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">Hợp lệ</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-bold">{group.customer_name} {group.customer_phone ? `(${group.customer_phone})` : ''}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Ngày đơn hàng</span>
                          <span className="text-slate-700 font-black text-xs">{group.order_date || '--/--/----'}</span>
                        </div>
                      </div>

                      {/* Card Body Table */}
                      <div className="p-3">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="p-2 pl-3">Mã SP</th>
                              <th className="p-2">Tên sản phẩm</th>
                              <th className="p-2 text-center">Số lượng</th>
                              <th className="p-2 text-right">Đơn giá</th>
                              <th className="p-2 text-right pr-3">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.items.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/30">
                                <td className="p-2 pl-3 font-mono font-bold text-slate-700">{item.product_code}</td>
                                <td className="p-2 text-slate-600 font-medium max-w-[200px] truncate">
                                  {item.isValid ? item.name : <span className="text-rose-500 italic">{item.errorMsg}</span>}
                                </td>
                                <td className="p-2 text-center font-bold text-slate-900">{item.qty} {item.unit || 'Cái'}</td>
                                <td className="p-2 text-right font-bold text-slate-600">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.unit_price)}
                                </td>
                                <td className="p-2 text-right pr-3">
                                  {item.isValid ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold text-[9px]">
                                      Hợp lệ
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold text-[9px]">
                                      Lỗi
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all uppercase tracking-wider"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmImport}
                disabled={groupedImportSOs.length === 0 || groupedImportSOs.every(g => g.items.every((x: any) => !x.isValid)) || loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 uppercase tracking-wider"
              >
                <span className="material-icons-round text-sm">check_circle</span>
                <span>Đồng ý nhập ({groupedImportSOs.reduce((acc, g) => acc + g.items.filter((x: any) => x.isValid).length, 0)} dòng hợp lệ)</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".xlsx,.xls,.csv" 
        className="hidden" 
      />

      {toast && (
        <div className="fixed top-6 right-6 z-[999] flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-2xl px-5 py-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
            toast.type === 'error' ? 'bg-rose-500/10 text-rose-400' :
            'bg-blue-500/10 text-blue-400'
          }`}>
            <span className="material-icons-round text-lg">
              {toast.type === 'success' ? 'check_circle' :
               toast.type === 'error' ? 'error' :
               'info'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Thông báo</p>
            <p className="text-xs font-bold text-white mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;