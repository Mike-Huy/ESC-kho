import React, { useState, useEffect } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';
import * as XLSX from 'xlsx';

interface Product {
  product_code: string;
  product_long: string;
  sn_control: boolean;
  unit: string;
}

interface InboundItem {
  product_code: string;
  name: string;
  qty: number;
  unit: string;
  sn_control: boolean;
  serials: string[];
}

interface GroupedImportPO {
  po_code: string;
  supplier_name: string;
  order_date: string;
  items: {
    product_code: string;
    qty: number;
    name?: string;
    unit?: string;
    sn_control?: boolean;
    isValid: boolean;
    errorMsg?: string;
    serials?: string[];
  }[];
}

interface InboundNewProps {
  hideHeader?: boolean;
}

const InboundNew: React.FC<InboundNewProps> = ({ hideHeader }) => {
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

  const generatePoCode = () => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `PO-${yy}${mm}${dd}-${rand}`;
  };
  const [poCode, setPoCode] = useState(generatePoCode);
  const [supplier, setSupplier] = useState(APP_CONFIG.ALLOWED_SUPPLIERS?.[0] || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [items, setItems] = useState<InboundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSNInput, setShowSNInput] = useState<number | null>(null);
  const [tempSN, setTempSN] = useState('');
  const [suppliersList, setSuppliersList] = useState<string[]>([]);
  const [orderDate, setOrderDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  
  const [parsedPoCode, setParsedPoCode] = useState<string | null>(null);
  const [parsedSupplier, setParsedSupplier] = useState<string | null>(null);
  const [parsedOrderDate, setParsedOrderDate] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [groupedImportPOs, setGroupedImportPOs] = useState<GroupedImportPO[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const downloadTemplate = () => {
    const data = [
      ["Mã đơn nhập (po_code)", "Nhà cung cấp (supplier_name)", "Mã sản phẩm (product_code)", "Số lượng (qty)", "Danh sách số Serial (serials)", "Ngày đơn nhập (order_date)"],
      ["PO-20260510-001", "Công ty Cổ phần Sữa Việt Nam (Vinamilk)", "SP001", 10, "", "10-05-2026"],
      ["PO-20260510-001", "Công ty Cổ phần Sữa Việt Nam (Vinamilk)", "SP002", 3, "SN10001;SN10002;SN10003", "10-05-2026"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MauDonNhap");
    XLSX.writeFile(workbook, "mau_nhap_don_nhap_chi_tiet.xlsx");
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
          po_code: string; 
          supplier_name: string; 
          product_code: string; 
          qty: number; 
          serials: string[]; 
          order_date: string; 
        }[] = [];

        let startIndex = 0;
        const firstRow = rows[0] || [];
        const firstCell = String(firstRow[0] || '').toLowerCase();
        if (firstCell.includes('mã') || firstCell.includes('code') || firstCell.includes('sản phẩm') || firstCell.includes('qty') || firstCell.includes('lượng') || firstCell.includes('nhà cung cấp')) {
          startIndex = 1;
        }

        for (let i = startIndex; i < rows.length; i++) {
          const parts = rows[i] || [];
          if (parts.length >= 2) {
            let filePo = '';
            let fileSupplier = '';
            let code = '';
            let qty = 1;
            let serials: string[] = [];
            let parsedDate = '';

            if (parts.length === 2) {
              code = String(parts[0] || '').trim();
              qty = parseInt(String(parts[1] || '1'), 10) || 1;
              filePo = poCode;
              fileSupplier = supplier;
              parsedDate = orderDate;
            } else {
              filePo = String(parts[0] || '').trim() || poCode;
              fileSupplier = String(parts[1] || '').trim() || supplier;
              code = String(parts[2] || '').trim();
              qty = parseInt(String(parts[3] || '1'), 10) || 1;
              const serials_str = String(parts[4] || '').trim();
              serials = serials_str ? serials_str.split(';').map(s => s.trim()).filter(Boolean) : [];
              
              const orderDate_val = parts[5];
              const parsed = parseExcelDate(orderDate_val);
              parsedDate = parsed ? parsed.split('T')[0] : orderDate;
            }

            if (code) {
              parsedRows.push({ 
                po_code: filePo, 
                supplier_name: fileSupplier, 
                product_code: code, 
                qty, 
                serials, 
                order_date: parsedDate 
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
          .select('product_code, product_long, sn_control, unit')
          .contains('website_id', [APP_CONFIG.WEBSITE_ID])
          .in('product_code', codes);

        if (error) throw error;

        const dbProductsMap = new Map<string, any>();
        dbProducts?.forEach(p => {
          dbProductsMap.set(p.product_code.toLowerCase(), p);
        });

        // Group rows by po_code
        const groupsMap = new Map<string, GroupedImportPO>();
        
        parsedRows.forEach(row => {
          const key = row.po_code;
          const dbProd = dbProductsMap.get(row.product_code.toLowerCase());
          
          let poGroup = groupsMap.get(key);
          if (!poGroup) {
            poGroup = {
              po_code: row.po_code,
              supplier_name: row.supplier_name,
              order_date: row.order_date,
              items: []
            };
            groupsMap.set(key, poGroup);
          }

          if (dbProd) {
            poGroup.items.push({
              product_code: dbProd.product_code,
              qty: row.serials.length > 0 && dbProd.sn_control ? row.serials.length : row.qty,
              name: dbProd.product_long,
              unit: dbProd.unit,
              sn_control: dbProd.sn_control,
              serials: row.serials,
              isValid: true
            });
          } else {
            poGroup.items.push({
              product_code: row.product_code,
              qty: row.qty,
              isValid: false,
              errorMsg: 'Mã sản phẩm không tồn tại',
              serials: row.serials
            });
          }
        });

        const finalGroups = Array.from(groupsMap.values());
        setGroupedImportPOs(finalGroups);
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
      
      const validGroups = groupedImportPOs.map(g => ({
        ...g,
        items: g.items.filter(item => item.isValid)
      })).filter(g => g.items.length > 0);

      if (validGroups.length === 0) {
        alert('Không có đơn hàng nhập hoặc sản phẩm nào hợp lệ để nhập!');
        return;
      }

      // Validate serials if controlled
      for (const group of validGroups) {
        for (const item of group.items) {
          if (item.sn_control && (!item.serials || item.serials.length === 0)) {
            alert(`Đơn ${group.po_code} có sản phẩm ${item.product_code} quản lý S/N nhưng chưa điền danh sách serial!`);
            return;
          }
        }
      }

      // Kiểm tra po_code nào đã tồn tại trong DB
      const poCodes = validGroups.map((g: GroupedImportPO) => g.po_code);
      const { data: existingPOs } = await supabase
        .from(TABLE('po'))
        .select('po_code')
        .in('po_code', poCodes);
      const existingCodes = new Set((existingPOs || []).map((r: any) => r.po_code));

      // Xóa dữ liệu cũ của các đơn trùng trước khi ghi đè
      if (existingCodes.size > 0) {
        const dupList = Array.from(existingCodes) as string[];
        await supabase.from(TABLE('serial_tracking')).delete().in('po_code', dupList);
        await supabase.from(TABLE('po_items')).delete().in('po_code', dupList);
        await supabase.from(TABLE('po')).delete().in('po_code', dupList);
      }

      // Save POs and their details
      for (const group of validGroups) {
        const { error: poError } = await supabase
          .from(TABLE('po'))
          .insert([{
            po_code: group.po_code,
            supplier_name: group.supplier_name,
            status: 'pending',
            order_date: group.order_date,
            website_id: [APP_CONFIG.WEBSITE_ID]
          }]);

        if (poError) {
          throw new Error(`Lỗi tạo đơn ${group.po_code}: ${poError.message}`);
        }

        const poItems = group.items.map(item => ({
          po_code: group.po_code,
          product_code: item.product_code,
          ordered_qty: item.qty,
          unit: item.unit || 'Cái',
        }));
        
        const { error: itemError } = await supabase
          .from(TABLE('po_items'))
          .insert(poItems);
          
        if (itemError) {
          throw new Error(`Lỗi thêm sản phẩm cho đơn ${group.po_code}: ${itemError.message}`);
        }

        const snEntries: any[] = [];
        group.items.forEach(item => {
          if (item.sn_control && item.serials) {
            item.serials.forEach(sn => {
              snEntries.push({
                product_code: item.product_code,
                serial_number: sn,
                status: 'available',
                po_code: group.po_code,
                website_id: [APP_CONFIG.WEBSITE_ID]
              });
            });
          }
        });

        if (snEntries.length > 0) {
          const { error: snError } = await supabase
            .from(TABLE('serial_tracking'))
            .insert(snEntries);
          if (snError) {
            throw new Error(`Lỗi lưu danh sách Serial cho đơn ${group.po_code}: ${snError.message}`);
          }
        }
      }

      const overwriteCount = existingCodes.size;
      const newCount = validGroups.length - overwriteCount;
      const msg = overwriteCount > 0
        ? `Nhập file thành công! Đã tạo mới ${newCount} đơn, ghi đè ${overwriteCount} đơn trùng.`
        : `Nhập file thành công! Đã tạo ${validGroups.length} đơn hàng nhập mới vào hệ thống.`;
      alert(msg);
      setShowImportModal(false);
      setGroupedImportPOs([]);
    } catch (err: any) {
      console.error('Error confirming import:', err);
      alert(err.message || 'Lỗi hệ thống khi lưu đơn nhập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      // Fetch distinct supplier names from po table
      const { data, error } = await supabase
        .from(TABLE('po'))
        .select('supplier_name')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);
      
      if (error) throw error;
      
      if (data) {
        // Filter unique names and remove empty ones
        const uniqueSuppliers = Array.from(new Set(data.map(item => item.supplier_name)))
          .filter(name => !!name)
          .sort() as string[];
        
        setSuppliersList(uniqueSuppliers);
        
        // If current supplier is empty and we have results, set first one as default
        if (!supplier && uniqueSuppliers.length > 0) {
          setSupplier(uniqueSuppliers[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const searchProducts = async (q: string) => {
    if (!q) {
      setSearchResults([]);
      return;
    }
    const { data, error } = await supabase
      .from(TABLE('product'))
      .select('product_code, product_long, sn_control, unit')
      .contains('website_id', [APP_CONFIG.WEBSITE_ID])
      .or(`product_code.ilike.%${q}%,product_long.ilike.%${q}%`)
      .limit(5);
    
    if (!error) setSearchResults(data || []);
  };

  const addItem = (p: Product) => {
    const existing = items.find(item => item.product_code === p.product_code);
    if (existing) {
      setItems(items.map(item => 
        item.product_code === p.product_code ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setItems([...items, { 
        product_code: p.product_code, 
        name: p.product_long, 
        qty: 1, 
        unit: p.unit, 
        sn_control: p.sn_control,
        serials: []
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddSN = (index: number) => {
    if (!tempSN) return;
    const newItems = [...items];
    if (!newItems[index].serials.includes(tempSN)) {
      newItems[index].serials.push(tempSN);
      newItems[index].qty = newItems[index].serials.length;
      setItems(newItems);
      setTempSN('');
    } else {
      alert('Số Serial này đã được nhập!');
    }
  };

  const removeSN = (itemIndex: number, snIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].serials.splice(snIndex, 1);
    newItems[itemIndex].qty = newItems[itemIndex].serials.length;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!supplier) {
      alert('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    if (items.length === 0) {
      alert('Vui lòng thêm sản phẩm');
      return;
    }
    
    // Check if enough S/Ns are entered
    for (const item of items) {
      if (item.sn_control && item.serials.length === 0) {
        alert(`Vui lòng nhập S/N cho sản phẩm ${item.product_code}`);
        return;
      }
    }

    try {
      setLoading(true);
      
      // 1. Create PO
      const { error: poError } = await supabase
        .from(TABLE('po'))
        .insert([{
          po_code: poCode,
          supplier_name: supplier,
          status: 'pending',
          order_date: orderDate,
          website_id: [APP_CONFIG.WEBSITE_ID]
        }]);

      if (poError) throw poError;

      // 2. Create PO Items
      const poItems = items.map(item => ({
        po_code: poCode,
        product_code: item.product_code,
        ordered_qty: item.qty,
        unit: item.unit,
        website_id: [APP_CONFIG.WEBSITE_ID]
      }));
      
      const { error: itemError } = await supabase
        .from(TABLE('po_items'))
        .insert(poItems);
        
      if (itemError) throw itemError;

      // 3. Create Serial Tracking entries
      const snEntries: any[] = [];
      items.forEach(item => {
        if (item.sn_control) {
          item.serials.forEach(sn => {
            snEntries.push({
              product_code: item.product_code,
              serial_number: sn,
              status: 'available',
              po_code: poCode,
              website_id: [APP_CONFIG.WEBSITE_ID]
            });
          });
        }
      });

      if (snEntries.length > 0) {
        const { error: snError } = await supabase
          .from(TABLE('serial_tracking'))
          .insert(snEntries);
        if (snError) throw snError;
      }

      alert('Tạo đơn nhập thành công!');
      // Reset form
      setPoCode(generatePoCode());
      setSupplier('');
      setItems([]);
      
    } catch (error: any) {
      console.error('Error creating PO:', error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="p-6 lg:p-10 space-y-6">
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
              <span>Đơn nhập</span>
              <span className="material-icons-round text-xs">chevron_right</span>
              <span className="text-primary font-bold">Tạo hàng mới</span>
            </nav>
            <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
              <span className="p-2 bg-emerald-100 rounded-lg">
                <span className="material-icons-round text-emerald-600">add_shopping_cart</span>
              </span>
              Tạo Đơn Nhập Hàng
            </h1>
          </div>
        </header>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info and Search */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Mã Đơn Nhập (PO)</label>
              <input 
                value={poCode} 
                onChange={(e) => setPoCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Nhà Cung Cấp</label>
              <div className="relative">
                <select 
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  <option value="" disabled>-- Chọn nhà cung cấp --</option>
                  {suppliersList.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                  {suppliersList.length === 0 && <option value="MM An Phú">MM An Phú (Mặc định)</option>}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 pointer-events-none">expand_more</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 font-medium italic">* Danh sách được lấy từ các đơn hàng trước đó</p>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Ngày đơn nhập</label>
              <input 
                type="date"
                value={orderDate} 
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm space-y-4 relative">
            <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Thêm Sản Phẩm</label>
            <div className="relative">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                placeholder="Tìm mã hoặc tên SP..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); searchProducts(e.target.value); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="absolute left-6 right-6 top-full mt-2 bg-white border border-border-light rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-50">
                {searchResults.map((p) => (
                  <button 
                    key={p.product_code}
                    onClick={() => addItem(p)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-primary">{p.product_code}</div>
                      <div className="text-sm font-bold text-slate-700">{p.product_long}</div>
                    </div>
                    {p.sn_control && (
                      <span className="material-icons-round text-primary text-sm" title="Quản lý S/N">qr_code</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-border-light bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">Danh sách hàng nhập</h3>
                <span className="text-[10px] bg-slate-200 px-2.5 py-0.5 rounded-full font-black text-slate-500 uppercase">{items.length} mặt hàng</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Excel Template Button */}
                <button 
                  onClick={downloadTemplate}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:border-slate-300"
                  title="Tải tệp mẫu Excel/CSV để nhập liệu"
                >
                  <span className="material-icons-round text-sm text-emerald-600">file_download</span>
                  <span>Excel Template</span>
                </button>
                
                {/* Excel Import Button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
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
            </div>
            
            <div className="flex-1 p-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                  <span className="material-icons-round text-6xl mb-4">shopping_basket</span>
                  <p className="font-bold">Chưa có sản phẩm nào được chọn</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all hover:border-primary/20">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                             <span className="material-symbols-outlined text-slate-400">package_2</span>
                          </div>
                          <div>
                            <div className="text-xs font-mono font-bold text-primary">{item.product_code}</div>
                            <div className="text-sm font-bold text-slate-800">{item.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {!item.sn_control && (
                             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase">SL:</label>
                                <input 
                                  type="number" 
                                  className="w-12 text-center font-bold text-slate-700 outline-none"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx].qty = Number(e.target.value);
                                    setItems(newItems);
                                  }}
                                />
                                <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
                             </div>
                           )}
                           <button 
                             onClick={() => setItems(items.filter((_, i) => i !== idx))}
                             className="text-slate-300 hover:text-rose-500 transition-colors"
                           >
                             <span className="material-icons-round">delete_outline</span>
                           </button>
                        </div>
                      </div>

                      {item.sn_control && (
                        <div className="mt-4 p-4 bg-white border border-slate-100 rounded-xl shadow-inner">
                           <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                 <span className="material-icons-round text-primary text-sm">qr_code</span>
                                 <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">Serial Number List ({item.serials.length})</span>
                              </div>
                              <button 
                                onClick={() => setShowSNInput(showSNInput === idx ? null : idx)}
                                className="text-xs font-bold text-primary hover:underline"
                              >
                                {showSNInput === idx ? 'Đóng nhập S/N' : '+ Thêm S/N'}
                              </button>
                           </div>
                           
                           {showSNInput === idx && (
                             <div className="flex gap-2 mb-3">
                                <input 
                                  placeholder="Quét hoặc nhập mã S/N..."
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                  value={tempSN}
                                  onChange={(e) => setTempSN(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddSN(idx)}
                                />
                                <button 
                                  onClick={() => handleAddSN(idx)}
                                  className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                                >
                                  OK
                                </button>
                             </div>
                           )}

                           {item.serials.length > 0 ? (
                             <div className="flex flex-wrap gap-2">
                               {item.serials.map((sn, sIdx) => (
                                 <div key={sIdx} className="bg-primary/5 border border-primary/20 rounded-lg px-2 py-1 flex items-center gap-2 group">
                                    <span className="text-[11px] font-mono font-bold text-primary">{sn}</span>
                                    <button 
                                      onClick={() => removeSN(idx, sIdx)}
                                      className="text-primary hover:text-rose-500"
                                    >
                                      <span className="material-icons-round text-[14px]">close</span>
                                    </button>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                                <span className="text-[11px] text-slate-400 font-bold uppercase italic">Chưa có S/N nào được nhập</span>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-border-light flex justify-end gap-3">
              <button 
                className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold text-sm hover:bg-slate-100 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Đang lưu đơn...' : 'Xác nhận tạo Đơn Nhập'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Excel/CSV Import Preview Modal */}
    {showImportModal && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
          {/* Modal Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-icons-round">file_upload</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">Kiểm tra Danh sách Nhập File</h3>
                <p className="text-slate-500 text-xs font-medium">Xem trước và đối soát mã sản phẩm theo từng Đơn hàng nhập</p>
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
                <p className="text-slate-900 text-xl font-black mt-1">{groupedImportPOs.length}</p>
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center shadow-sm">
                <p className="text-emerald-600/70 text-[10px] font-extrabold uppercase tracking-wider">Hợp lệ</p>
                <p className="text-emerald-700 text-xl font-black mt-1">
                  {groupedImportPOs.filter(g => g.items.every(x => x.isValid)).length} đơn
                </p>
              </div>
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl text-center shadow-sm">
                <p className="text-rose-600/70 text-[10px] font-extrabold uppercase tracking-wider">Có lỗi mã SP</p>
                <p className="text-rose-700 text-xl font-black mt-1">
                  {groupedImportPOs.filter(g => g.items.some(x => !x.isValid)).length} đơn
                </p>
              </div>
            </div>

            {/* List of Grouped PO Cards */}
            <div className="space-y-4">
              {groupedImportPOs.map((group, gIdx) => {
                const hasError = group.items.some(x => !x.isValid);
                return (
                  <div key={gIdx} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md ${hasError ? 'border-rose-200' : 'border-slate-150'}`}>
                    {/* Card Header */}
                    <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${hasError ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50/50 border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <span className="material-icons-round text-primary text-lg">receipt_long</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-800">{group.po_code}</span>
                            {hasError ? (
                              <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">Có lỗi</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">Hợp lệ</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">{group.supplier_name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block">Ngày đơn nhập</span>
                        <span className="text-slate-700 font-bold text-xs">{group.order_date || '--/--/----'}</span>
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
                            <th className="p-2 text-right pr-3">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/30">
                              <td className="p-2 pl-3 font-mono font-bold text-slate-700">{item.product_code}</td>
                              <td className="p-2 text-slate-600 font-medium max-w-[200px] truncate">
                                {item.isValid ? item.name : <span className="text-rose-500 italic">{item.errorMsg}</span>}
                              </td>
                              <td className="p-2 text-center font-bold text-slate-900">{item.qty} {item.unit || ''}</td>
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
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={confirmImport}
              disabled={groupedImportPOs.length === 0 || groupedImportPOs.every(g => g.items.every(x => !x.isValid))}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              <span className="material-icons-round text-sm">check_circle</span>
              Đồng ý nhập ({groupedImportPOs.reduce((acc, g) => acc + g.items.filter(x => x.isValid).length, 0)} dòng hợp lệ)
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default InboundNew;
