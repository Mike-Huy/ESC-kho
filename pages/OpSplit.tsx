import React, { useEffect, useState, useCallback } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface Product {
  product_code: string;
  product_long: string;
  unit: string;
  unit2: string;
  unit2_ratio: number;
}

interface SplitRecord {
  id: number;
  product_code: string;
  product_name: string;
  qty: number;
  unit: string;
  from_location: string;
  to_location: string;
  moved_by_name: string;
  moved_at: string;
  notes: string;
}

const fmtDateTime = (d: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const OpSplit: React.FC = () => {
  const [history, setHistory]     = useState<SplitRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [products, setProducts]   = useState<Product[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  const [form, setForm] = useState({
    product_code: '',
    qty: '',
    from_location: '',
    to_location: '',
    notes: '',
  });

  const selectedProduct = products.find(p => p.product_code === form.product_code);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE('stock_movement'))
        .select(`
          id, product_code, qty, unit, from_location, to_location, moved_at, notes,
          user:moved_by(full_name)
        `)
        .eq('movement_type', 'split')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('moved_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []).map((r: any) => ({
        id:           r.id,
        product_code: r.product_code,
        product_name: '',
        qty:          Number(r.qty),
        unit:         r.unit || '',
        from_location: r.from_location || '—',
        to_location:  r.to_location || '—',
        moved_by_name: r.user?.full_name || '—',
        moved_at:     r.moved_at,
        notes:        r.notes || '',
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from(TABLE('product'))
      .select('product_code, product_long, unit, unit2, unit2_ratio')
      .contains('website_id', [APP_CONFIG.WEBSITE_ID])
      .eq('status', 'active')
      .not('unit2', 'is', null)
      .order('product_code');
    setProducts(data || []);
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_code || !form.qty) {
      setErrorMsg('Vui lòng chọn sản phẩm và nhập số lượng.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from(TABLE('stock_movement'))
        .insert({
          movement_type: 'split',
          ref_type:      'SPLIT',
          product_code:  form.product_code,
          wh_code:       APP_CONFIG.DEFAULT_WH_CODE,
          from_location: form.from_location || null,
          to_location:   form.to_location || null,
          qty:           Number(form.qty),
          unit:          selectedProduct?.unit2 || selectedProduct?.unit || '',
          notes:         form.notes || null,
          website_id:    [APP_CONFIG.WEBSITE_ID],
        });

      if (error) throw error;
      setSuccessMsg('Đã ghi nhận rã hàng thành công!');
      setForm({ product_code: '', qty: '', from_location: '', to_location: '', notes: '' });
      setShowForm(false);
      fetchHistory();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Vận hành</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Rã hàng chẵn</span>
          </nav>
          <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
            <span className="p-2 bg-orange-50 rounded-lg">
              <span className="material-icons-round text-orange-500">splitscreen</span>
            </span>
            Rã hàng chẵn
          </h1>
          <p className="text-sm text-slate-400 mt-1">Tách thùng/lốc/kiện thành đơn vị lẻ và ghi nhận biến động kho.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setErrorMsg(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <span className="material-icons-round text-sm">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Đóng' : 'Tạo phiếu rã hàng'}
        </button>
      </header>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          <span className="material-icons-round text-base">check_circle</span>{successMsg}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <span className="material-icons-round text-primary text-base">edit_note</span>
            Phiếu rã hàng mới
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Sản phẩm <span className="text-rose-500">*</span></label>
              <select value={form.product_code} onChange={e => setForm(f => ({ ...f, product_code: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary bg-white" required>
                <option value="">-- Chọn sản phẩm --</option>
                {products.map(p => (
                  <option key={p.product_code} value={p.product_code}>
                    [{p.product_code}] {p.product_long} — {p.unit2 ? `1 ${p.unit2} = ${p.unit2_ratio} ${p.unit}` : p.unit}
                  </option>
                ))}
              </select>
              {selectedProduct?.unit2 && (
                <p className="text-xs text-primary mt-1 font-medium">
                  Đơn vị rã: <strong>{selectedProduct.unit2}</strong> → {selectedProduct.unit2_ratio} {selectedProduct.unit}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Số lượng rã ({selectedProduct?.unit2 || 'đơn vị lớn'}) <span className="text-rose-500">*</span>
              </label>
              <input type="number" min="1" step="1" value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" required />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Vị trí lấy hàng</label>
              <input type="text" placeholder="VD: A1-01-01" value={form.from_location}
                onChange={e => setForm(f => ({ ...f, from_location: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Vị trí đặt hàng lẻ</label>
              <input type="text" placeholder="VD: A1-02-01" value={form.to_location}
                onChange={e => setForm(f => ({ ...f, to_location: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
              <input type="text" placeholder="Lý do rã hàng, số lô, ..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>

            {errorMsg && (
              <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">{errorMsg}</div>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
                Lưu phiếu rã hàng
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-border-light rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Huỷ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-light flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 text-sm">
            <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
            Lịch sử rã hàng (50 bản ghi gần nhất)
          </h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400">
              <div className="inline-block w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
              <p className="text-sm">Đang tải...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-extrabold text-slate-400">
                  <th className="px-5 py-2 border-b border-border-light">Mã SP</th>
                  <th className="px-5 py-2 border-b border-border-light text-right">SL rã</th>
                  <th className="px-5 py-2 border-b border-border-light">Từ vị trí</th>
                  <th className="px-5 py-2 border-b border-border-light">Đến vị trí</th>
                  <th className="px-5 py-2 border-b border-border-light">Người thực hiện</th>
                  <th className="px-5 py-2 border-b border-border-light">Thời gian</th>
                  <th className="px-5 py-2 border-b border-border-light">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400 italic">Chưa có dữ liệu rã hàng</td></tr>
                ) : history.map(r => (
                  <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-1.5 font-mono text-xs font-bold text-primary">{r.product_code}</td>
                    <td className="px-5 py-1.5 text-right font-bold text-slate-700 text-xs">{r.qty.toLocaleString()} <span className="text-slate-400 font-normal">{r.unit}</span></td>
                    <td className="px-5 py-1.5 text-slate-600 text-xs">{r.from_location}</td>
                    <td className="px-5 py-1.5 text-slate-600 text-xs">{r.to_location}</td>
                    <td className="px-5 py-1.5 text-slate-600 text-xs">{r.moved_by_name}</td>
                    <td className="px-5 py-1.5 text-slate-500 text-xs">{fmtDateTime(r.moved_at)}</td>
                    <td className="px-5 py-1.5 text-slate-400 text-xs max-w-[180px] truncate">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpSplit;
