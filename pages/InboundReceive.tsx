import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface InboundReceiveProps {
  poCode: string;
  onBack: () => void;
}

interface POItem {
  id: number;
  product_code: string;
  ordered_qty: number;
  received_qty: number;
  unit: string;
  product?: {
    product_long: string;
    sn_control: boolean;
    image: string;
  };
  scanned_serials: string[];
}

const InboundReceive: React.FC<InboundReceiveProps> = ({ poCode, onBack }) => {
  const [items, setItems] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);

  const [poInfo, setPoInfo] = useState<any>(null);

  const getProductImageUrl = (imagePath: string) => {
    if (!imagePath) return "https://zrjwslcxbfefzjlgctci.supabase.co/storage/v1/object/public/product_images/placeholder.png";
    if (imagePath.startsWith('http')) return imagePath;
    return `https://zrjwslcxbfefzjlgctci.supabase.co/storage/v1/object/public/product_images/${imagePath}`;
  };

  useEffect(() => {
    fetchPODetails();
  }, [poCode]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const { data: poData, error: poError } = await supabase
        .from('po')
        .select('*')
        .eq('po_code', poCode)
        .single();
        
      if (poError || !poData) throw new Error(poError?.message || 'Không tìm thấy đơn hàng');
      setPoInfo(poData);

      let { data: itemData } = await supabase
        .from('po_items')
        .select(`
          id,
          product_code,
          ordered_qty,
          received_qty,
          unit,
          product:product_code (
            product_long,
            sn_control,
            image
          )
        `)
        .eq('po_id', poData.id);

      if (!itemData || itemData.length === 0) {
        const jsonItems = poData.items || [];
        if (jsonItems.length > 0) {
          const itemsToInsert = jsonItems.map((it: any) => ({
            po_id: poData.id,
            product_code: it.product_code,
            ordered_qty: it.quantity || it.ordered_qty || 1,
            received_qty: it.received_qty || 0,
            unit: it.unit || 'cái',
            vat_rate: it.vat_rate || 0.1,
            website_id: [APP_CONFIG.WEBSITE_ID]
          }));
          await supabase.from('po_items').insert(itemsToInsert);
          const { data: refetch } = await supabase
            .from('po_items')
            .select(`
              id, product_code, ordered_qty, received_qty, unit,
              product:product_code (product_long, sn_control, image)
            `)
            .eq('po_id', poData.id);
          itemData = refetch;
        }
      }

      const { data: snData } = await supabase
        .from('serial_tracking')
        .select('product_code, serial_number')
        .eq('po_code', poCode);

      const finalItems = (itemData || []).map((item: any) => {
        const itemSerials = snData
          ?.filter(sn => sn.product_code === item.product_code)
          .map(sn => sn.serial_number) || [];
          
        return {
          ...item,
          scanned_serials: itemSerials,
          received_qty: item.product?.sn_control ? itemSerials.length : (item.received_qty || 0)
        };
      });

      setItems(finalItems);
    } catch (error: any) {
      console.error('Error fetching PO details:', error);
      alert('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = scanValue.trim();
    if (!value || poInfo?.status === 'received') return;

    let productCode = value;
    let serialNumber: string | null = null;

    if (value.includes('-')) {
      const parts = value.split('-');
      productCode = parts[0];
      serialNumber = parts.slice(1).join('-');
    }

    let itemIdx = items.findIndex(it => it.product_code === productCode);

    if (itemIdx === -1 && activeItemIdx !== null) {
      itemIdx = activeItemIdx;
      serialNumber = value;
    }

    if (itemIdx === -1) {
      itemIdx = items.findIndex(it => it.product?.sn_control && it.scanned_serials.length < it.ordered_qty);
      if (itemIdx !== -1) serialNumber = value;
    }

    if (itemIdx === -1) {
      alert(`Không tìm thấy sản phẩm phù hợp cho mã "${value}"`);
      setScanValue('');
      return;
    }

    const item = items[itemIdx];
    const newItems = [...items];

    if (item.product?.sn_control) {
      if (!serialNumber) {
        setActiveItemIdx(itemIdx);
        setScanValue('');
        return;
      }

      if (item.scanned_serials.includes(serialNumber)) {
        alert('Số Serial này đã được quét!');
      } else if (item.scanned_serials.length >= item.ordered_qty) {
        alert('Sản phẩm đã đủ số lượng!');
      } else {
        const updatedSerials = [...item.scanned_serials, serialNumber];
        newItems[itemIdx] = {
          ...item,
          scanned_serials: updatedSerials,
          received_qty: updatedSerials.length
        };
        setItems(newItems);
      }
    } else {
      if (item.received_qty < item.ordered_qty) {
        newItems[itemIdx] = {
          ...item,
          received_qty: (item.received_qty || 0) + 1
        };
        setItems(newItems);
      } else {
        alert('Đã đạt giới hạn số lượng!');
      }
    }
    setScanValue('');
  };

  const updateNonSNQty = (idx: number, val: string) => {
    if (poInfo?.status === 'received') return;
    const qty = parseInt(val) || 0;
    if (qty > items[idx].ordered_qty) {
      alert(`Không được vượt quá ${items[idx].ordered_qty}`);
      return;
    }
    const newItems = [...items];
    newItems[idx] = { ...items[idx], received_qty: qty };
    setItems(newItems);
  };

  const addManualSN = (idx: number, sn: string) => {
    if (poInfo?.status === 'received') return;
    const val = sn.trim();
    if (!val) return;
    
    if (items[idx].scanned_serials.includes(val)) {
      alert('Số Serial này đã được gán!');
      return;
    }

    const updatedSerials = [...items[idx].scanned_serials, val];
    const newItems = [...items];
    newItems[idx] = {
      ...items[idx],
      scanned_serials: updatedSerials,
      received_qty: updatedSerials.length
    };
    
    setItems(newItems);
    setScanValue('');
    setActiveItemIdx(null);
  };

  const handleConfirmReceive = async () => {
    try {
      setReceiving(true);
      for (const item of items) {
        if (item.product?.sn_control && item.scanned_serials.length < item.ordered_qty) {
           const ok = window.confirm(`Sản phẩm ${item.product_code} chưa đủ S/N (${item.scanned_serials.length}/${item.ordered_qty}). Bạn vẫn muốn lưu?`);
           if (!ok) { setReceiving(false); return; }
        }
      }

      for (const item of items) {
        const qty = item.product?.sn_control ? item.scanned_serials.length : item.received_qty;
        if (item.id > 0) {
          await supabase.from('po_items').update({ received_qty: qty }).eq('id', item.id);
        } else {
          await supabase.from('po_items').insert({
            po_id: poInfo.id,
            product_code: item.product_code,
            ordered_qty: item.ordered_qty,
            received_qty: qty,
            unit: item.unit,
            website_id: [APP_CONFIG.WEBSITE_ID]
          });
        }
      }

      const updatedJsonItems = items.map(it => ({
        product_code: it.product_code,
        quantity: it.ordered_qty,
        received_qty: it.product?.sn_control ? it.scanned_serials.length : it.received_qty,
        unit: it.unit,
        ...(poInfo.items.find((orig: any) => orig.product_code === it.product_code) || {})
      }));

      await supabase.from('po').update({ items: updatedJsonItems }).eq('id', poInfo.id);
      await supabase.from('serial_tracking').delete().eq('po_code', poCode);
      
      const snEntries: any[] = [];
      items.forEach(item => {
        if (item.product?.sn_control) {
          item.scanned_serials.forEach(sn => {
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
        await supabase.from('serial_tracking').insert(snEntries);
      }

      await supabase.from('po').update({ status: 'received', actual_delivery: new Date().toISOString() }).eq('po_code', poCode);
      onBack();
    } catch (error) {
      console.error('Error receiving goods:', error);
      alert('Đã có lỗi xảy ra!');
    } finally {
      setReceiving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
             <button onClick={onBack} className="hover:text-primary transition-colors">Đơn nhập</button>
             <span className="material-icons-round text-xs">chevron_right</span>
             <span className="text-primary font-bold">Nhận hàng #{poCode}</span>
          </nav>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">NHẬN HÀNG ĐƠN #{poCode}</h1>
        </div>
        <div className="flex items-center gap-3">
            {poInfo?.status === 'received' ? (
              <span className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider border border-slate-200">
                ĐƠN HÀNG ĐÃ NHẬN
              </span>
            ) : (
               <button 
                 onClick={handleConfirmReceive}
                 disabled={receiving}
                 className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
               >
                 {receiving ? 'ĐANG LƯU...' : 'XÁC NHẬN NHẬP KHO'}
               </button>
            )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Scanner Input */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
               <label className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">TRẠM QUÉT NHẬN HÀNG</label>
               <form onSubmit={handleScan} className="relative">
                  <span className="material-icons-round absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 text-3xl">qr_code_scanner</span>
                   <input 
                    autoFocus
                    placeholder={poInfo?.status === 'received' ? "Đơn hàng đã nhận - Không thể quét thêm" : "Quét mã QR sản phẩm hoặc S/N..."}
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    disabled={poInfo?.status === 'received'}
                    className={`w-full bg-white/5 border-2 border-white/10 rounded-3xl pl-16 pr-6 py-6 text-2xl font-black text-white outline-none transition-all ${poInfo?.status === 'received' ? 'opacity-50 cursor-not-allowed' : 'focus:border-primary/50 focus:bg-white/10'}`}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                     <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-tighter border border-emerald-500/30 anim-pulse">READY</span>
                  </div>
               </form>
               <p className="mt-4 text-white/40 text-[10px] font-bold uppercase tracking-widest text-center">HỖ TRỢ QUÉT KẾT HỢP [MÃ SP]-[S/N] HOẶC QUÉT RIÊNG LẺ</p>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-[2.5rem] border border-border-light shadow-sm overflow-hidden min-h-[500px]">
             <div className="p-6 border-b border-border-light bg-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Danh sách sản phẩm trong đơn</h3>
                <span className="text-[10px] font-black bg-white px-4 py-1.5 rounded-full border border-slate-100 text-slate-400">{items.length} MẶT HÀNG</span>
             </div>
             
             <div className="px-6 py-4 space-y-4 bg-slate-50/30">
                {items.map((item, idx) => (
                  <div key={idx} className={`bg-white rounded-[2rem] border transition-all duration-300 overflow-hidden ${activeItemIdx === idx ? 'border-primary ring-4 ring-primary/10 shadow-xl' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                    <div className="p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 p-1 shrink-0 flex items-center justify-center">
                            <img src={getProductImageUrl(item.product?.image || "")} className="w-full h-full object-contain" />
                         </div>
                         <div>
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                               <span className="text-[11px] font-mono font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{item.product_code}</span>
                               
                               {/* S/N Tags displayed next to product code as requested */}
                               {item.scanned_serials.map((sn, sIdx) => (
                                 <div key={sIdx} className="group flex items-center gap-1.5 text-[11px] font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shadow-sm transition-all hover:bg-slate-200">
                                   {sn}
                                    {poInfo?.status !== 'received' && (
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         const updatedSerials = item.scanned_serials.filter((_, i) => i !== sIdx);
                                         const newItems = [...items];
                                         newItems[idx] = { ...item, scanned_serials: updatedSerials, received_qty: updatedSerials.length };
                                         setItems(newItems);
                                       }}
                                       className="text-slate-400 hover:text-red-500 transition-colors"
                                     >
                                       <span className="material-icons-round text-[12px]">close</span>
                                     </button>
                                   )}
                                 </div>
                               ))}

                               {item.product?.sn_control && <span className="material-icons-round text-primary/40 text-[18px]" title="Sản phẩm quản lý S/N">qr_code</span>}
                            </div>
                            <h4 className="font-black text-slate-900 text-[13px] leading-snug uppercase tracking-tight">{item.product?.product_long}</h4>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-8 shrink-0">
                         <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thực nhận</p>
                            <div className="flex items-center gap-2">
                               {!item.product?.sn_control ? (
                                 <input 
                                   type="number"
                                   min="0"
                                   max={item.ordered_qty}
                                   value={item.received_qty}
                                   onChange={(e) => updateNonSNQty(idx, e.target.value)}
                                   readOnly={poInfo?.status === 'received'}
                                   className={`w-16 bg-slate-50 border-2 border-slate-100 rounded-lg px-2 py-0.5 text-center font-black text-slate-900 outline-none ${poInfo?.status === 'received' ? 'opacity-50' : 'focus:border-primary'}`}
                                 />
                               ) : (
                                 <span className="text-xl font-black text-slate-900">
                                   {item.scanned_serials.length}
                                 </span>
                               )}
                               <span className="text-slate-300 font-bold">/</span>
                               <span className="text-base font-bold text-slate-400">{item.ordered_qty}</span>
                               <span className="text-[10px] font-bold text-slate-400 ml-1">{item.unit}</span>
                            </div>
                         </div>
                         <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                              className={`h-full transition-all duration-700 ease-out ${
                                (item.product?.sn_control ? item.scanned_serials.length : item.received_qty) >= item.ordered_qty ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(100, ((item.product?.sn_control ? item.scanned_serials.length : item.received_qty) / item.ordered_qty) * 100)}%` }}
                            ></div>
                          </div>
                      </div>
                    </div>

                    {/* Manual Input Section - Cleaner and integrated */}
                    {item.product?.sn_control && (
                      <div className={`transition-all duration-300 border-t ${activeItemIdx === idx ? 'bg-primary/[0.02] border-primary/10' : 'bg-white border-transparent'}`}>
                        <div className="px-5 py-2 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                Nhập số Serial còn thiếu
                              </span>
                           </div>
                            {poInfo?.status !== 'received' ? (
                              <button 
                                onClick={() => setActiveItemIdx(activeItemIdx === idx ? null : idx)}
                                className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg transition-all ${
                                  activeItemIdx === idx ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-primary hover:bg-primary/5 border border-primary/10'
                                }`}
                              >
                                {activeItemIdx === idx ? 'Đang nhập...' : '+ NHẬP THỦ CÔNG'}
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Chỉ xem</span>
                            )}
                        </div>
                        
                        {activeItemIdx === idx && (
                          <div className="px-5 pb-4 animate-in slide-in-from-top-2 duration-300">
                             <div className="flex gap-2 bg-white p-1.5 rounded-xl border-2 border-primary/20 focus-within:border-primary transition-all shadow-sm focus-within:ring-4 ring-primary/5">
                                <input 
                                  autoFocus
                                  className="flex-1 bg-transparent px-3 py-1.5 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300 placeholder:font-normal"
                                  placeholder="Nhập serial và nhấn Enter..."
                                  value={scanValue}
                                  onChange={(e) => setScanValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      addManualSN(idx, scanValue);
                                    }
                                  }}
                                />
                                <button 
                                  onClick={() => addManualSN(idx, scanValue)}
                                  className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all"
                                >
                                  Ghi nhận
                                </button>
                             </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-white rounded-[2rem] border border-border-light p-8 shadow-sm">
              <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em] mb-6">Thông tin PO</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nhà cung cấp</label>
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">{poInfo?.supplier_name?.[0]}</div>
                       <p className="font-black text-slate-800 uppercase text-sm tracking-tighter">{poInfo?.supplier_name || 'CHƯA CẬP NHẬT'}</p>
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kho đích</label>
                    <div className="flex items-center gap-2">
                       <span className="material-icons-round text-slate-400 text-sm">warehouse</span>
                       <p className="font-bold text-slate-700 text-xs uppercase">KHO ESC - CHÍNH</p>
                    </div>
                 </div>
              </div>
              <div className="mt-10 pt-10 border-t border-slate-100">
                 <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Trạng thái hiện tại</p>
                    <span className="text-sm font-black uppercase tracking-widest text-white">{poInfo?.status === 'pending' ? 'CHỜ NHẬN' : poInfo?.status === 'draft' ? 'NHÁP' : 'ĐÃ NHẬN'}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InboundReceive;
