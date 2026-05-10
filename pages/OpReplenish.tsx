import React, { useEffect, useState, useCallback } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface LowStockItem {
  product_code: string;
  product_name: string;
  unit: string;
  available_qty: number;
  location_code: string;
  status: 'critical' | 'low' | 'ok';
}

interface ReplenishRecord {
  id: number;
  product_code: string;
  qty: number;
  unit: string;
  from_location: string;
  to_location: string;
  moved_by_name: string;
  moved_at: string;
  notes: string;
}

const THRESHOLD_CRITICAL = 5;
const THRESHOLD_LOW = 20;

const fmtDateTime = (d: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const OpReplenish: React.FC = () => {
  const [lowStock, setLowStock]   = useState<LowStockItem[]>([]);
  const [history, setHistory]     = useState<ReplenishRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [histLoading, setHistLoading] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [threshold, setThreshold] = useState(THRESHOLD_LOW);
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

  const fetchLowStock = useCallback(async (thr: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE('inventory'))
        .select(`
          product_code, available_qty, location_code,
          product:${TABLE('product')}(product_long, unit)
        `)
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .lte('available_qty', thr)
        .order('available_qty', { ascending: true })
        .limit(100);

      if (error) throw error;
      setLowStock((data || []).map((r: any) => {
        const p = Array.isArray(r.product) ? r.product[0] : r.product;
        const qty = Number(r.available_qty || 0);
        return {
          product_code:  r.product_code,
          product_name:  p?.product_long || r.product_code,
          unit:          p?.unit || '',
          available_qty: qty,
          location_code: r.location_code || '—',
          status:        qty <= THRESHOLD_CRITICAL ? 'critical' : qty <= THRESHOLD_LOW ? 'low' : 'ok',
        };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE('stock_movement'))
        .select('id, product_code, qty, unit, from_location, to_location, moved_at, notes, user:moved_by(full_name)')
        .eq('movement_type', 'adjust')
        .eq('ref_type', 'REPLENISH')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('moved_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistory((data || []).map((r: any) => ({
        id:            r.id,
        product_code:  r.product_code,
        qty:           Number(r.qty),
        unit:          r.unit || '',
        from_location: r.from_location || '—',
        to_location:   r.to_location || '—',
        moved_by_name: r.user?.full_name || '—',
        moved_at:      r.moved_at,
        notes:         r.notes || '',
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStock(threshold);
    fetchHistory();
  }, [threshold]);

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
          movement_type: 'adjust',
          ref_type:      'REPLENISH',
          product_code:  form.product_code,
          wh_code:       APP_CONFIG.DEFAULT_WH_CODE,
          from_location: form.from_location || null,
          to_location:   form.to_location || null,
          qty:           Number(form.qty),
          unit:          lowStock.find(s => s.product_code === form.product_code)?.unit || '',
          notes:         form.notes || 'Châm hàng bổ sung tồn kho',
          website_id:    [APP_CONFIG.WEBSITE_ID],
        });

      if (error) throw error;
      setSuccessMsg('Đã ghi nhận châm hàng thành công!');
      setForm({ product_code: '', qty: '', from_location: '', to_location: '', notes: '' });
      setShowForm(false);
      fetchHistory();
      fetchLowStock(threshold);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const criticalCount = lowStock.filter(s => s.status === 'critical').length;
  const lowCount = lowStock.filter(s => s.status === 'low').length;

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Vận hành</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Châm hàng</span>
          </nav>
          <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
            <span className="p-2 bg-rose-50 rounded-lg">
              <span className="material-icons-round text-rose-500">add_shopping_cart</span>
            </span>
            Châm hàng
          </h1>
          <p className="text-sm text-slate-400 mt-1">Theo dõi sản phẩm tồn thấp và ghi nhận bổ sung hàng vào kho.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setErrorMsg(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <span className="material-icons-round text-sm">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Đóng' : 'Ghi nhận châm hàng'}
        </button>
      </header>

      {/* Alert summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-icons-round text-rose-500 text-2xl">warning</span>
          <div>
            <p className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider">Cạn kiệt (≤{THRESHOLD_CRITICAL})</p>
            <p className="text-2xl font-extrabold text-rose-600">{criticalCount}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-icons-round text-amber-500 text-2xl">error_outline</span>
          <div>
            <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">Tồn thấp (≤{threshold})</p>
            <p className="text-2xl font-extrabold text-amber-600">{lowCount}</p>
          </div>
        </div>
        <div className="bg-white border border-border-light rounded-xl p-4 flex items-center gap-3 col-span-2">
          <span className="material-icons-round text-slate-400 text-2xl">tune</span>
          <div className="flex-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Ngưỡng cảnh báo tồn thấp</p>
            <input type="number" min="1" max="999" value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-28 px-3 py-1 border border-border-light rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          <span className="material-icons-round text-base">check_circle</span>{successMsg}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-800 mb-4">Ghi nhận châm hàng</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Sản phẩm <span className="text-rose-500">*</span></label>
              <select value={form.product_code} onChange={e => setForm(f => ({ ...f, product_code: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary bg-white" required>
                <option value="">-- Chọn sản phẩm cần châm hàng --</option>
                {lowStock.map(s => (
                  <option key={s.product_code} value={s.product_code}>
                    [{s.product_code}] {s.product_name} — Tồn: {s.available_qty} {s.unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Số lượng bổ sung <span className="text-rose-500">*</span></label>
              <input type="number" min="1" value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Lấy từ vị trí</label>
              <input type="text" placeholder="VD: KHO-DU-01" value={form.from_location}
                onChange={e => setForm(f => ({ ...f, from_location: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Châm vào vị trí</label>
              <input type="text" placeholder="VD: A1-01-01" value={form.to_location}
                onChange={e => setForm(f => ({ ...f, to_location: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
              <input type="text" placeholder="Châm từ kho dự phòng, lô hàng X, ..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            {errorMsg && <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">{errorMsg}</div>}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
                Lưu
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-border-light rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Huỷ</button>
            </div>
          </form>
        </div>
      )}

      {/* Low stock table */}
      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-light">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
            Sản phẩm cần châm hàng (tồn ≤ {threshold})
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
                  <th className="px-5 py-2 border-b border-border-light">Mức độ</th>
                  <th className="px-5 py-2 border-b border-border-light">Mã SP</th>
                  <th className="px-5 py-2 border-b border-border-light">Tên sản phẩm</th>
                  <th className="px-5 py-2 border-b border-border-light">Vị trí</th>
                  <th className="px-5 py-2 border-b border-border-light text-right">Tồn hiện tại</th>
                  <th className="px-5 py-2 border-b border-border-light text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lowStock.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 italic">Không có sản phẩm nào cần châm hàng</td></tr>
                ) : lowStock.map(s => (
                  <tr key={s.product_code} className={`transition-colors ${s.status === 'critical' ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-amber-50/30'}`}>
                    <td className="px-5 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                        {s.status === 'critical' ? 'Cạn kiệt' : 'Tồn thấp'}
                      </span>
                    </td>
                    <td className="px-5 py-1.5 font-mono text-xs font-bold text-primary">{s.product_code}</td>
                    <td className="px-5 py-1.5 font-medium text-slate-700 text-xs max-w-[220px] truncate">{s.product_name}</td>
                    <td className="px-5 py-1.5 text-slate-500 text-xs">{s.location_code}</td>
                    <td className={`px-5 py-1.5 text-right font-extrabold text-sm ${s.status === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {s.available_qty.toLocaleString()} <span className="text-xs font-normal text-slate-400">{s.unit}</span>
                    </td>
                    <td className="px-5 py-1.5 text-center">
                      <button onClick={() => { setForm(f => ({ ...f, product_code: s.product_code, to_location: s.location_code !== '—' ? s.location_code : '' })); setShowForm(true); }}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-colors">
                        Châm hàng
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Replenish history */}
      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-light">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
            Lịch sử châm hàng (30 bản ghi gần nhất)
          </h3>
        </div>
        <div className="overflow-x-auto">
          {histLoading ? (
            <div className="p-6 text-center text-slate-400 text-sm">Đang tải...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-extrabold text-slate-400">
                  <th className="px-5 py-2 border-b border-border-light">Mã SP</th>
                  <th className="px-5 py-2 border-b border-border-light text-right">SL châm</th>
                  <th className="px-5 py-2 border-b border-border-light">Từ vị trí</th>
                  <th className="px-5 py-2 border-b border-border-light">Đến vị trí</th>
                  <th className="px-5 py-2 border-b border-border-light">Người thực hiện</th>
                  <th className="px-5 py-2 border-b border-border-light">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400 italic text-sm">Chưa có lịch sử châm hàng</td></tr>
                ) : history.map(r => (
                  <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-1.5 font-mono text-xs font-bold text-primary">{r.product_code}</td>
                    <td className="px-5 py-1.5 text-right font-bold text-emerald-600 text-xs">+{r.qty.toLocaleString()} {r.unit}</td>
                    <td className="px-5 py-1.5 text-slate-500 text-xs">{r.from_location}</td>
                    <td className="px-5 py-1.5 text-slate-600 text-xs">{r.to_location}</td>
                    <td className="px-5 py-1.5 text-slate-600 text-xs">{r.moved_by_name}</td>
                    <td className="px-5 py-1.5 text-slate-500 text-xs">{fmtDateTime(r.moved_at)}</td>
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

export default OpReplenish;
