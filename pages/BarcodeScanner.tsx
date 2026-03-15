import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const BarcodeScanner: React.FC = () => {
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sku.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      // 1. Kiểm tra xem mã quét có phải là định dạng PRODUCT_CODE-SERIAL_NUMBER không
      let effectiveProductCode = sku.trim();
      let detectedSerial = null;

      if (effectiveProductCode.includes('-')) {
        const { data: snData, error: snError } = await supabase
          .from('serial_tracking')
          .select('product_code, serial_number')
          .eq('product_code_and_sn', effectiveProductCode)
          .single();
        
        if (!snError && snData) {
          effectiveProductCode = snData.product_code;
          detectedSerial = snData.serial_number;
        }
      }

      // 2. Tìm sản phẩm theo product_code hoặc barcode
      const { data: productData, error: pError } = await supabase
        .from('product')
        .select('*')
        .or(`product_code.eq."${effectiveProductCode}",barcode.eq."${effectiveProductCode}"`)
        .single();

      if (pError) {
        if (pError.code === 'PGRST116') {
          setError('Không tìm thấy sản phẩm với mã này.');
        } else {
          console.error('Supabase error:', pError);
          setError('Lỗi truy vấn sản phẩm.');
        }
        setProduct(null);
        return;
      }

      // 2. Lấy thông tin tồn kho tại các vị trí từ wh_stock
      const { data: stockData, error: sError } = await supabase
        .from('wh_stock')
        .select('location_code, quantity')
        .eq('product_code', productData.product_code);

      if (sError) throw sError;

      // 3. Tính tổng tồn kho
      const totalStock = stockData?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

      setProduct({
        code: productData.product_code,
        name: productData.product_long || productData.product_short,
        image: productData.image || 'https://via.placeholder.com/400x300?text=No+Image',
        totalStock: totalStock,
        unit: productData.unit,
        locations: stockData?.map(item => ({
          pos: item.location_code,
          qty: item.quantity
        })) || []
      });

    } catch (err: any) {
      console.error('Search error:', err);
      setError('Đã có lỗi xảy ra khi truy vấn dữ liệu.');
    } finally {
      setLoading(false);
      setSku(''); // Clear input after search to ready for next scan
    }
  };

  // Tự động tìm kiếm nếu SKU dài (ví dụ từ máy quét vạch)
  useEffect(() => {
    if (sku.length >= 7) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sku]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-5" style={{backgroundImage: 'radial-gradient(#1d6ac9 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
      
      {/* Top Navigation Control */}
      <div className="bg-white px-8 py-4 border-b border-slate-200 flex justify-between items-center z-10 shrink-0">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <span className="material-icons-round">qr_code_scanner</span>
            </div>
            <div>
               <h1 className="text-lg font-black text-slate-800 tracking-tight">TRẠM QUÉT SẢN PHẨM</h1>
               <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {loading ? 'Đang truy vấn...' : 'Hệ thống sẵn sàng'}
                  </span>
               </div>
            </div>
         </div>
         {error && (
           <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 animate-bounce">
              {error}
           </div>
         )}
      </div>

      <div className="flex-1 flex overflow-hidden z-10 p-6 gap-6">
          {/* Left: Input & Search Form */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
               <form onSubmit={handleSearch}>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block">Nhập hoặc quét mã vạch sản phẩm</label>
                  <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                        <span className="material-icons-round text-3xl">barcode_reader</span>
                     </div>
                     <input 
                        autoFocus 
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        disabled={loading}
                        className="block w-full pl-16 pr-4 py-6 bg-slate-100 border-2 border-transparent rounded-2xl text-2xl font-black text-slate-900 focus:bg-white focus:border-primary transition-all outline-none disabled:opacity-50" 
                        placeholder="Quét mã tại đây..." 
                        type="text" 
                     />
                     {loading && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                           <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        </div>
                     )}
                  </div>
               </form>
            </div>

            {/* Results Area */}
            {product ? (
               <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                     <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <span className="material-icons-round text-sm">location_on</span> Vị trí tồn kho chi tiết
                     </h2>
                  </div>
                  <div className="overflow-y-auto flex-1 p-6">
                     {product.locations.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                           {product.locations.map((loc: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between group hover:border-primary transition-colors">
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mã vị trí</p>
                                    <p className="text-2xl font-black text-slate-800">{loc.pos}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số lượng tồn</p>
                                    <p className="text-2xl font-black text-primary">{loc.qty.toLocaleString()}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                           <span className="material-icons-round text-6xl opacity-20">inventory_2</span>
                           <p className="font-bold text-sm">Sản phẩm hiện không có tồn kho tại vị trí nào</p>
                        </div>
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                  <span className="material-icons-round text-8xl text-slate-300 mb-4 font-thin">manage_search</span>
                  <p className="font-bold text-slate-400">Vui lòng quét mã để xem thông tin tồn kho</p>
               </div>
            )}
          </div>

          {/* Right: Product Card Overlay */}
          <div className="w-[450px] shrink-0">
             {product ? (
               <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 h-full flex flex-col animate-in fade-in slide-in-from-right-10 duration-500">
                  <div className="aspect-[4/3] bg-slate-100 rounded-2xl mb-8 relative overflow-hidden border border-slate-200 group">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      onError={(e: any) => e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'}
                    />
                    <div className="absolute top-4 left-4">
                       <span className="bg-primary text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase">SKU ACTIVE</span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                       <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{product.code}</p>
                       <h3 className="text-3xl font-black text-slate-900 leading-tight">{product.name}</h3>
                    </div>

                    <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Tổng tồn kho thực tế</p>
                          <p className="text-4xl font-black">{product.totalStock.toLocaleString()} <span className="text-sm font-medium opacity-80">{product.unit || 'Đơn vị'}</span></p>
                       </div>
                       <span className="material-icons-round text-5xl opacity-40">inventory</span>
                    </div>

                    <div className="pt-4 grid grid-cols-2 gap-3">
                       <button className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
                          <span className="material-icons-round">edit</span> SỬA THÔNG TIN
                       </button>
                       <button className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95">
                          <span className="material-icons-round">print</span> IN TEM MÃ
                       </button>
                    </div>
                  </div>
               </div>
             ) : (
               <div className="h-full bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                     <span className="material-icons-round text-slate-300 text-4xl">inventory_2</span>
                  </div>
                  <h4 className="font-bold text-slate-400">Chưa có thông tin sản phẩm</h4>
                  <p className="text-xs text-slate-400 mt-2">Dữ liệu sản phẩm sẽ hiển thị tại đây sau khi quét thành công</p>
               </div>
             )}
          </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;