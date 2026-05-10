import React, { useEffect, useState, useCallback } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface AuditSession {
  id: number;
  audit_code: string;
  audit_date: string;
  status: string;
  note: string;
  audited_by_name: string;
  item_count: number;
  diff_count: number;
}

interface AuditItem {
  id: number;
  product_code: string;
  product_name: string;
  unit: string;
  location_code: string;
  system_qty: number;
  actual_qty: number;
  diff_qty: number;
  notes: string;
}

interface Product {
  product_code: string;
  product_long: string;
  unit: string;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:       { label: 'Nháp',         cls: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'Đang kiểm kê', cls: 'bg-amber-100 text-amber-600' },
  completed:   { label: 'Hoàn tất',     cls: 'bg-emerald-100 text-emerald-600' },
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

const genAuditCode = () => {
  const now = new Date();
  return `KK${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getTime()).slice(-4)}`;
};

const OpAudit: React.FC = () => {
  const [sessions, setSessions]   = useState<AuditSession[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [selectedSession, setSelectedSession] = useState<AuditSession | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [products, setProducts]   = useState<Product[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  const [newForm, setNewForm] = useState({ audit_date: new Date().toISOString().split('T')[0], note: '' });
  const [addItemForm, setAddItemForm] = useState({ product_code: '', location_code: '', system_qty: '', actual_qty: '', notes: '' });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE('stock_audit'))
        .select(`
          id, audit_code, audit_date, status, note,
          auditor:audited_by(full_name),
          items:${TABLE('stock_audit_items')}(id, diff_qty)
        `)
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('audit_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSessions((data || []).map((r: any) => ({
        id:              r.id,
        audit_code:      r.audit_code,
        audit_date:      r.audit_date,
        status:          r.status,
        note:            r.note || '',
        audited_by_name: r.auditor?.full_name || '—',
        item_count:      Array.isArray(r.items) ? r.items.length : 0,
        diff_count:      Array.isArray(r.items) ? r.items.filter((i: any) => Number(i.diff_qty) !== 0).length : 0,
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
      .select('product_code, product_long, unit')
      .contains('website_id', [APP_CONFIG.WEBSITE_ID])
      .eq('status', 'active')
      .order('product_code');
    setProducts(data || []);
  }, []);

  const fetchAuditItems = useCallback(async (auditCode: string) => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE('stock_audit_items'))
        .select(`
          id, product_code, location_code, system_qty, actual_qty, diff_qty, notes,
          product:${TABLE('product')}(product_long, unit)
        `)
        .eq('audit_code', auditCode);

      if (error) throw error;
      setAuditItems((data || []).map((r: any) => ({
        id:           r.id,
        product_code: r.product_code,
        product_name: Array.isArray(r.product) ? r.product[0]?.product_long : r.product?.product_long || r.product_code,
        unit:         Array.isArray(r.product) ? r.product[0]?.unit : r.product?.unit || '',
        location_code: r.location_code || '—',
        system_qty:   Number(r.system_qty || 0),
        actual_qty:   Number(r.actual_qty || 0),
        diff_qty:     Number(r.diff_qty || 0),
        notes:        r.notes || '',
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedSession) fetchAuditItems(selectedSession.audit_code);
  }, [selectedSession]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from(TABLE('stock_audit'))
        .insert({
          audit_code: genAuditCode(),
          audit_date: newForm.audit_date,
          wh_code:    APP_CONFIG.DEFAULT_WH_CODE,
          status:     'draft',
          note:       newForm.note || null,
          website_id: [APP_CONFIG.WEBSITE_ID],
        });

      if (error) throw error;
      setSuccessMsg('Đã tạo phiên kiểm kê mới!');
      setShowNewForm(false);
      setNewForm({ audit_date: new Date().toISOString().split('T')[0], note: '' });
      fetchSessions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo phiên kiểm kê.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !addItemForm.product_code) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from(TABLE('stock_audit_items'))
        .insert({
          audit_code:    selectedSession.audit_code,
          product_code:  addItemForm.product_code,
          location_code: addItemForm.location_code || null,
          system_qty:    Number(addItemForm.system_qty || 0),
          actual_qty:    Number(addItemForm.actual_qty || 0),
          notes:         addItemForm.notes || null,
        });

      if (error) throw error;
      setAddItemForm({ product_code: '', location_code: '', system_qty: '', actual_qty: '', notes: '' });
      fetchAuditItems(selectedSession.audit_code);
      fetchSessions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi thêm sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (auditCode: string, newStatus: string) => {
    const { error } = await supabase
      .from(TABLE('stock_audit'))
      .update({ status: newStatus })
      .eq('audit_code', auditCode);

    if (!error) {
      fetchSessions();
      if (selectedSession?.audit_code === auditCode) {
        setSelectedSession(s => s ? { ...s, status: newStatus } : null);
      }
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Vận hành</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Kiểm kê kho</span>
          </nav>
          <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
            <span className="p-2 bg-indigo-50 rounded-lg">
              <span className="material-icons-round text-indigo-500">fact_check</span>
            </span>
            Kiểm kê kho
          </h1>
        </div>
        <button onClick={() => { setShowNewForm(!showNewForm); setErrorMsg(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <span className="material-icons-round text-sm">{showNewForm ? 'close' : 'add'}</span>
          {showNewForm ? 'Đóng' : 'Tạo phiên kiểm kê'}
        </button>
      </header>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          <span className="material-icons-round text-base">check_circle</span>{successMsg}
        </div>
      )}

      {showNewForm && (
        <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-800 mb-4">Tạo phiên kiểm kê mới</h3>
          <form onSubmit={handleCreateSession} className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ngày kiểm kê</label>
              <input type="date" value={newForm.audit_date}
                onChange={e => setNewForm(f => ({ ...f, audit_date: e.target.value }))}
                className="px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ghi chú</label>
              <input type="text" placeholder="Kiểm kê định kỳ tháng 5, ..." value={newForm.note}
                onChange={e => setNewForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            {errorMsg && <p className="w-full text-rose-500 text-sm">{errorMsg}</p>}
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
              Tạo phiên kiểm kê
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Session list */}
        <div className={`xl:col-span-2 bg-white border border-border-light rounded-xl overflow-hidden shadow-sm ${selectedSession ? 'hidden xl:block' : 'block'}`}>
          <div className="p-4 border-b border-border-light">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
              Danh sách phiên kiểm kê
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="inline-block w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
                <p className="text-sm">Đang tải...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">Chưa có phiên kiểm kê nào</div>
            ) : sessions.map(s => (
              <div key={s.id}
                onClick={() => setSelectedSession(s)}
                className={`p-4 cursor-pointer hover:bg-primary/5 transition-colors ${selectedSession?.id === s.id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs text-primary">{s.audit_code}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtDate(s.audit_date)}</p>
                    {s.note && <p className="text-xs text-slate-400 truncate mt-0.5">{s.note}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${STATUS_LABEL[s.status]?.cls}`}>
                    {STATUS_LABEL[s.status]?.label || s.status}
                  </span>
                </div>
                <div className="flex gap-3 mt-2 text-[10px] font-bold text-slate-400">
                  <span>{s.item_count} sản phẩm</span>
                  {s.diff_count > 0 && <span className="text-rose-500">{s.diff_count} chênh lệch</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session detail */}
        <div className={`xl:col-span-3 space-y-4 ${selectedSession ? 'block' : 'hidden xl:block'}`}>
          {!selectedSession ? (
            <div className="bg-white border border-border-light rounded-xl p-10 text-center text-slate-400 shadow-sm">
              <span className="material-icons-round text-4xl mb-2 opacity-30">fact_check</span>
              <p className="text-sm font-medium">Chọn một phiên kiểm kê để xem chi tiết</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-border-light rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelectedSession(null)} 
                        className="xl:hidden p-1 -ml-1 mr-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center">
                        <span className="material-icons-round text-lg">arrow_back</span>
                      </button>
                      <p className="font-mono font-extrabold text-primary">{selectedSession.audit_code}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Ngày kiểm kê: {fmtDate(selectedSession.audit_date)}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedSession.status === 'draft' && (
                      <button onClick={() => handleUpdateStatus(selectedSession.audit_code, 'in_progress')}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors">
                        Bắt đầu kiểm kê
                      </button>
                    )}
                    {selectedSession.status === 'in_progress' && (
                      <button onClick={() => handleUpdateStatus(selectedSession.audit_code, 'completed')}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors">
                        Hoàn tất kiểm kê
                      </button>
                    )}
                  </div>
                </div>

                {selectedSession.status !== 'completed' && (
                  <form onSubmit={handleAddItem} className="border-t border-border-light pt-4 mt-2">
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Thêm sản phẩm kiểm kê</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <select value={addItemForm.product_code}
                          onChange={e => setAddItemForm(f => ({ ...f, product_code: e.target.value }))}
                          className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary bg-white" required>
                          <option value="">-- Chọn sản phẩm --</option>
                          {products.map(p => <option key={p.product_code} value={p.product_code}>[{p.product_code}] {p.product_long}</option>)}
                        </select>
                      </div>
                      <input type="text" placeholder="Vị trí kho" value={addItemForm.location_code}
                        onChange={e => setAddItemForm(f => ({ ...f, location_code: e.target.value }))}
                        className="px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <input type="number" min="0" step="0.001" placeholder="SL hệ thống" value={addItemForm.system_qty}
                        onChange={e => setAddItemForm(f => ({ ...f, system_qty: e.target.value }))}
                        className="px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <input type="number" min="0" step="0.001" placeholder="SL thực tế *" value={addItemForm.actual_qty}
                        onChange={e => setAddItemForm(f => ({ ...f, actual_qty: e.target.value }))}
                        className="px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" required />
                      <input type="text" placeholder="Ghi chú" value={addItemForm.notes}
                        onChange={e => setAddItemForm(f => ({ ...f, notes: e.target.value }))}
                        className="px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                      <button type="submit" disabled={saving}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
                        Thêm
                      </button>
                    </div>
                    {errorMsg && <p className="text-rose-500 text-xs mt-2">{errorMsg}</p>}
                  </form>
                )}
              </div>

              <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border-light flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Chi tiết kiểm kê</h3>
                  <span className="text-xs text-slate-400">{auditItems.length} sản phẩm</span>
                </div>
                <div className="overflow-x-auto">
                  {itemsLoading ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Đang tải...</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-extrabold text-slate-400">
                          <th className="px-4 py-2 border-b border-border-light">Sản phẩm</th>
                          <th className="px-4 py-2 border-b border-border-light">Vị trí</th>
                          <th className="px-4 py-2 border-b border-border-light text-right">SL hệ thống</th>
                          <th className="px-4 py-2 border-b border-border-light text-right">SL thực tế</th>
                          <th className="px-4 py-2 border-b border-border-light text-right">Chênh lệch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {auditItems.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic text-sm">Chưa có sản phẩm nào</td></tr>
                        ) : auditItems.map(item => (
                          <tr key={item.id} className={`transition-colors ${item.diff_qty !== 0 ? 'bg-rose-50/40 hover:bg-rose-50/80' : 'hover:bg-primary/5'}`}>
                            <td className="px-4 py-1.5">
                              <p className="font-mono text-xs font-bold text-primary">{item.product_code}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[160px]">{item.product_name}</p>
                            </td>
                            <td className="px-4 py-1.5 text-xs text-slate-500">{item.location_code}</td>
                            <td className="px-4 py-1.5 text-right text-xs font-bold text-slate-600">{item.system_qty.toLocaleString()}</td>
                            <td className="px-4 py-1.5 text-right text-xs font-bold text-slate-700">{item.actual_qty.toLocaleString()}</td>
                            <td className={`px-4 py-1.5 text-right text-xs font-extrabold ${item.diff_qty > 0 ? 'text-emerald-600' : item.diff_qty < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {item.diff_qty > 0 ? `+${item.diff_qty}` : item.diff_qty === 0 ? '—' : item.diff_qty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpAudit;
