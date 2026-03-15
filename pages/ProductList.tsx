import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

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

  const fetchProducts = async (page: number) => {
    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('product')
        .select('id, product_code, product_long, unit, sn_control, status, brand', { count: 'exact' });

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

  const toggleSNControl = async (id: number, currentStatus: boolean, productCode: string) => {
    try {
      const { error } = await supabase
        .from('product')
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
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Kho hàng</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Danh mục sản phẩm</span>
          </nav>
          <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
            <span className="p-2 bg-primary/10 rounded-lg">
              <span className="material-icons-round text-primary">inventory_2</span>
            </span>
            Danh mục Sản phẩm
          </h1>
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
                    <th className="px-6 py-4">Mã SP</th>
                    <th className="px-6 py-4">Tên Sản Phẩm</th>
                    <th className="px-6 py-4">ĐVT</th>
                    <th className="px-6 py-4 text-center">Quản lý S/N</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-primary font-bold">
                        {product.product_code}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700 text-[14px]">{product.product_long}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-semibold">
                        {product.unit}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleSNControl(product.id, product.sn_control, product.product_code)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            product.sn_control ? 'bg-primary' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              product.sn_control ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div className={`text-[10px] mt-1 font-bold ${product.sn_control ? 'text-primary' : 'text-slate-400'}`}>
                          {product.sn_control ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
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
  );
};

export default ProductList;
