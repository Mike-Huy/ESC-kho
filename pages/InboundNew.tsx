import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

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

const InboundNew: React.FC = () => {
  const [poCode, setPoCode] = useState(`PO-${new Date().getTime().toString().slice(-6)}`);
  const [supplier, setSupplier] = useState(APP_CONFIG.ALLOWED_SUPPLIERS?.[0] || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [items, setItems] = useState<InboundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSNInput, setShowSNInput] = useState<number | null>(null);
  const [tempSN, setTempSN] = useState('');

  const searchProducts = async (q: string) => {
    if (!q) {
      setSearchResults([]);
      return;
    }
    const { data, error } = await supabase
      .from('product')
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
      const { data: poData, error: poError } = await supabase
        .from('po')
        .insert([{
          po_code: poCode,
          supplier_name: supplier,
          status: 'pending',
          website_id: APP_CONFIG.WEBSITE_ID
        }])
        .select()
        .single();
        
      if (poError) throw poError;

      // 2. Create PO Items
      const poItems = items.map(item => ({
        po_id: poData.id,
        product_code: item.product_code,
        ordered_qty: item.qty,
        unit: item.unit,
        website_id: APP_CONFIG.WEBSITE_ID
      }));
      
      const { error: itemError } = await supabase
        .from('po_items')
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
              website_id: APP_CONFIG.WEBSITE_ID
            });
          });
        }
      });

      if (snEntries.length > 0) {
        const { error: snError } = await supabase
          .from('serial_tracking')
          .insert(snEntries);
        if (snError) throw snError;
      }

      alert('Tạo đơn nhập thành công!');
      // Reset form
      setPoCode(`PO-${new Date().getTime().toString().slice(-6)}`);
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
    <div className="p-6 lg:p-10 space-y-6">
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
              <input 
                placeholder="Nhập tên nhà cung cấp..."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
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
            <div className="p-4 border-b border-border-light bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Danh sách hàng nhập</h3>
              <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">{items.length} mặt hàng</span>
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
  );
};

export default InboundNew;
