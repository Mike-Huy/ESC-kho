import React, { useEffect, useState, useCallback } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface TransferSession {
  id: number;
  transfer_code: string;
  transfer_date: string;
  from_wh_code: string;
  to_wh_code: string;
  from_location: string;
  to_location: string;
  status: string;
  note: string;
  item_count: number;
}

interface TransferItem {
  id: number;
  product_code: string;
  product_name: string;
  unit: string;
  qty: number;
}

interface Product {
  product_code: string;
  product_long: string;
  unit: string;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Chờ xử lý',  cls: 'bg-slate-100 text-slate-500' },
  in_transit: { label: 'Đang vận chuyển', cls: 'bg-amber-100 text-amber-600' },
  completed: { label: 'Hoàn tất',   cls: 'bg-emerald-100 text-emerald-600' },
  cancelled: { label: 'Đã huỷ',     cls: 'bg-rose-100 text-rose-600' },
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

const genTransferCode = () => {
  const now = new Date();
  return `LC${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getTime()).slice(-4)}`;
};

const OpTransfer: React.FC = () => {
  const [sessions, setSessions]   = useState<TransferSession[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [selectedSession, setSelectedSession] = useState<TransferSession | null>(null);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [products, setProducts]   = useState<Product[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  const [newForm, setNewForm] = useState({
    transfer_date: new Date().toISOString().split('T')[0],
    from_location: '',
    to_location: '',
    note: '',
  });

  const [addItemForm, setAddItemForm] = useState({ product_code: '', qty: '' });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE('stock_transfer'))
        .select(`
          id, transfer_code, transfer_date, from_wh_code, to_wh_code,
          from_location, to_location, status, note,
          items:${TABLE('stock_transfer_items')}(id)
        `)
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('transfer_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSessions((data || []).map((r: any) => ({
        id:             r.id,
        transfer_code:  r.transfer_code,
        transfer_date:  r.transfer_date,
        from_wh_code:   r.from_wh_code || '—',
        to_wh_code:     r.to_wh_code || '—',
        from_location:  r.from_location || '—',
        to_location:    r.to_location || '—',
        status:         r.status,
        note:           r.note || '',
        item_count:     Array.isArray(r.items) ? r.items.length : 0,
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

  const fetchItems = useCallback(async (transferCode: string) => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE('stock_transfer_items'))
        .select(`
          id, product_code, qty, unit,
          product:${TABLE('product')}(product_long)
        `)
        .eq('transfer_code', transferCode);

      if (error) throw error;
      setTransferItems((data || []).map((r: any) => ({
        id:           r.id,
        product_code: r.product_code,
        product_name: Array.isArray(r.product) ? r.product[0]?.product_long : r.product?.product_long || r.product_code,
        unit:         r.unit || '',
        qty:          Number(r.qty),
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
    if (selectedSession) fetchItems(selectedSession.transfer_code);
  }, [selectedSession]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from(TABLE('stock_transfer'))
        .insert({
          transfer_code: genTransferCode(),
          transfer_date: newForm.transfer_date,
          from_wh_code:  APP_CONFIG.DEFAULT_WH_CODE,
          to_wh_code:    APP_CONFIG.DEFAULT_WH_CODE,
          from_location: newForm.from_location || null,
          to_location:   newForm.to_location || null,
          status:        'pending',
          note:          newForm.note || null,
          website_id:    [APP_CONFIG.WEBSITE_ID],
        });

      if (error) throw error;
      setSuccessMsg('Đã tạo phiếu luân chuyển!');
      setShowNewForm(false);
      setNewForm({ transfer_date: new Date().toISOString().split('T')[0], from_location: '', to_location: '', note: '' });
      fetchSessions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo phiếu.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !addItemForm.product_code || !addItemForm.qty) return;
    setSaving(true);
    try {
      const prod = products.find(p => p.product_code === addItemForm.product_code);
      const { error } = await supabase
        .from(TABLE('stock_transfer_items'))
        .insert({
          transfer_code: selectedSession.transfer_code,
          product_code:  addItemForm.product_code,
          qty:           Number(addItemForm.qty),
          unit:          prod?.unit || '',
        });

      if (error) throw error;
      setAddItemForm({ product_code: '', qty: '' });
      fetchItems(selectedSession.transfer_code);
      fetchSessions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi thêm sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (code: string, newStatus: string) => {
    const { error } = await supabase
      .from(TABLE('stock_transfer'))
      .update({ status: newStatus })
      .eq('transfer_code', code);

    if (!error) {
      fetchSessions();
      if (selectedSession?.transfer_code === code)
        setSelectedSession(s => s ? { ...s, status: newStatus } : null);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Vận hành</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Luân chuyển hàng</span>
          </nav>
          <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
            <span className="p-2 bg-teal-50 rounded-lg">
              <span className="material-icons-round text-teal-500">swap_horiz</span>
            </span>
            Luân chuyển hàng
          </h1>
          <p className="text-sm text-slate-400 mt-1">Chuyển hàng giữa các vị trí hoặc khu vực trong kho.</p>
        </div>
        <button onClick={() => { setShowNewForm(!showNewForm); setErrorMsg(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <span className="material-icons-round text-sm">{showNewForm ? 'close' : 'add'}</span>
          {showNewForm ? 'Đóng' : 'Tạo phiếu luân chuyển'}
        </button>
      </header>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          <span className="material-icons-round text-base">check_circle</span>{successMsg}
        </div>
      )}

      {showNewForm && (
        <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-800 mb-4">Tạo phiếu luân chuyển mới</h3>
          <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Ngày luân chuyển</label>
              <input type="date" value={newForm.transfer_date}
                onChange={e => setNewForm(f => ({ ...f, transfer_date: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
              <input type="text" placeholder="Lý do luân chuyển, ..." value={newForm.note}
                onChange={e => setNewForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Vị trí xuất phát</label>
              <input type="text" placeholder="VD: A1-01-01" value={newForm.from_location}
                onChange={e => setNewForm(f => ({ ...f, from_location: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Vị trí đích</label>
              <input type="text" placeholder="VD: B2-03-01" value={newForm.to_location}
                onChange={e => setNewForm(f => ({ ...f, to_location: e.target.value }))}
                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            {errorMsg && <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">{errorMsg}</div>}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
                Tạo phiếu
              </button>
              <button type="button" onClick={() => setShowNewForm(false)}
                className="px-6 py-2 border border-border-light rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Huỷ</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Session list */}
        <div className={`xl:col-span-2 bg-white border border-border-light rounded-xl overflow-hidden shadow-sm ${selectedSession ? 'hidden xl:block' : 'block'}`}>
          <div className="p-4 border-b border-border-light">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
              Danh sách phiếu luân chuyển
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="inline-block w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
                <p className="text-sm">Đang tải...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">Chưa có phiếu luân chuyển nào</div>
            ) : sessions.map(s => (
              <div key={s.id}
                onClick={() => setSelectedSession(s)}
                className={`p-4 cursor-pointer hover:bg-primary/5 transition-colors ${selectedSession?.id === s.id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs text-primary">{s.transfer_code}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtDate(s.transfer_date)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.from_location} → {s.to_location}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${STATUS_LABEL[s.status]?.cls || 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[s.status]?.label || s.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{s.item_count} sản phẩm</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className={`xl:col-span-3 space-y-4 ${selectedSession ? 'block' : 'hidden xl:block'}`}>
          {!selectedSession ? (
            <div className="bg-white border border-border-light rounded-xl p-10 text-center text-slate-400 shadow-sm">
              <span className="material-icons-round text-4xl mb-2 opacity-30">swap_horiz</span>
              <p className="text-sm font-medium">Chọn một phiếu luân chuyển để xem chi tiết</p>
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
                      <p className="font-mono font-extrabold text-primary">{selectedSession.transfer_code}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {fmtDate(selectedSession.transfer_date)} · {selectedSession.from_location} → {selectedSession.to_location}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedSession.status === 'pending' && (
                      <button onClick={() => handleUpdateStatus(selectedSession.transfer_code, 'in_transit')}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors">
                        Bắt đầu vận chuyển
                      </button>
                    )}
                    {selectedSession.status === 'in_transit' && (
                      <button onClick={() => handleUpdateStatus(selectedSession.transfer_code, 'completed')}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors">
                        Xác nhận hoàn tất
                      </button>
                    )}
                  </div>
                </div>

                {selectedSession.status === 'pending' && (
                  <form onSubmit={handleAddItem} className="border-t border-border-light pt-4 mt-2">
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Thêm sản phẩm</p>
                    <div className="flex gap-3">
                      <select value={addItemForm.product_code}
                        onChange={e => setAddItemForm(f => ({ ...f, product_code: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary bg-white" required>
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map(p => <option key={p.product_code} value={p.product_code}>[{p.product_code}] {p.product_long}</option>)}
                      </select>
                      <input type="number" min="1" placeholder="Số lượng" value={addItemForm.qty}
                        onChange={e => setAddItemForm(f => ({ ...f, qty: e.target.value }))}
                        className="w-24 px-3 py-2 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" required />
                      <button type="submit" disabled={saving}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">Thêm</button>
                    </div>
                    {errorMsg && <p className="text-rose-500 text-xs mt-2">{errorMsg}</p>}
                  </form>
                )}
              </div>

              <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border-light flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Chi tiết hàng luân chuyển</h3>
                  <span className="text-xs text-slate-400">{transferItems.length} sản phẩm</span>
                </div>
                <div className="overflow-x-auto">
                  {itemsLoading ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Đang tải...</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-extrabold text-slate-400">
                          <th className="px-4 py-2 border-b border-border-light">Mã SP</th>
                          <th className="px-4 py-2 border-b border-border-light">Tên sản phẩm</th>
                          <th className="px-4 py-2 border-b border-border-light text-right">Số lượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {transferItems.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic text-sm">Chưa có sản phẩm nào</td></tr>
                        ) : transferItems.map(item => (
                          <tr key={item.id} className="hover:bg-primary/5 transition-colors">
                            <td className="px-4 py-1.5 font-mono text-xs font-bold text-primary">{item.product_code}</td>
                            <td className="px-4 py-1.5 text-xs text-slate-700 font-medium">{item.product_name}</td>
                            <td className="px-4 py-1.5 text-right font-bold text-slate-700 text-xs">{item.qty.toLocaleString()} <span className="text-slate-400 font-normal">{item.unit}</span></td>
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

export default OpTransfer;
