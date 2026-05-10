import React, { useEffect, useState, useCallback } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface SORow {
  so_code: string;
  order_date: string;
  shipped_date: string;
  customer_name: string;
  carrier: string;
  tracking_no: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
}

interface Stats {
  total_so: number;
  total_revenue: number;
  total_paid: number;
  total_debt: number;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  shipped:   { label: 'Đã giao', cls: 'bg-emerald-100 text-emerald-600' },
  completed: { label: 'Hoàn tất', cls: 'bg-emerald-100 text-emerald-700' },
  returned:  { label: 'Hoàn trả', cls: 'bg-orange-100 text-orange-600' },
  cancelled: { label: 'Đã huỷ',   cls: 'bg-rose-100 text-rose-600' },
};

const PAY_LABEL: Record<string, { label: string; cls: string }> = {
  unpaid:  { label: 'Chưa TT',     cls: 'bg-rose-100 text-rose-600' },
  partial: { label: 'TT một phần', cls: 'bg-amber-100 text-amber-600' },
  paid:    { label: 'Đã TT',       cls: 'bg-emerald-100 text-emerald-600' },
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};
const fmtMoney = (n: number) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const PAGE_SIZE = 15;

const OutboundReport: React.FC = () => {
  const [rows, setRows]         = useState<SORow[]>([]);
  const [stats, setStats]       = useState<Stats>({ total_so: 0, total_revenue: 0, total_paid: 0, total_debt: 0 });
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchStats = useCallback(async (from: string, to: string, status: string, q: string) => {
    let query = supabase
      .from(TABLE('so'))
      .select('total_amount, paid_amount', { count: 'exact' })
      .contains('website_id', [APP_CONFIG.WEBSITE_ID])
      .in('status', status ? [status] : ['shipped', 'completed', 'returned']);

    if (from) query = query.gte('shipped_date', from);
    if (to)   query = query.lte('shipped_date', to);
    if (q)    query = query.or(`so_code.ilike.%${q}%,customer_name.ilike.%${q}%`);

    const { data, count } = await query;
    if (data) {
      const total_revenue = data.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const total_paid    = data.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
      setStats({ total_so: count || 0, total_revenue, total_paid, total_debt: total_revenue - total_paid });
    }
  }, []);

  const fetchData = useCallback(async (pg: number, from: string, to: string, status: string, q: string) => {
    setLoading(true);
    try {
      const rangeFrom = (pg - 1) * PAGE_SIZE;
      const rangeTo   = rangeFrom + PAGE_SIZE - 1;

      let query = supabase
        .from(TABLE('so'))
        .select('so_code, order_date, shipped_date, customer_name, carrier, tracking_no, status, total_amount, paid_amount, payment_status', { count: 'exact' })
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .in('status', status ? [status] : ['shipped', 'completed', 'returned']);

      if (from) query = query.gte('shipped_date', from);
      if (to)   query = query.lte('shipped_date', to);
      if (q)    query = query.or(`so_code.ilike.%${q}%,customer_name.ilike.%${q}%`);

      const { data, error, count } = await query
        .order('shipped_date', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (error) throw error;
      setTotalCount(count || 0);
      setRows((data || []).map((r: any) => ({
        so_code:        r.so_code,
        order_date:     r.order_date,
        shipped_date:   r.shipped_date || '',
        customer_name:  r.customer_name || '—',
        carrier:        r.carrier || '—',
        tracking_no:    r.tracking_no || '—',
        status:         r.status,
        total_amount:   Number(r.total_amount || 0),
        paid_amount:    Number(r.paid_amount || 0),
        payment_status: r.payment_status,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(dateFrom, dateTo, statusFilter, search);
    fetchData(page, dateFrom, dateTo, statusFilter, search);
  }, [page, dateFrom, dateTo, statusFilter, search]);

  const applyFilter = () => { setSearch(searchInput); setPage(1); };
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-2 font-medium">
            <span>Báo cáo</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="text-primary font-bold">Báo cáo Xuất kho</span>
          </nav>
          <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900">
            <span className="p-2 bg-blue-50 rounded-lg">
              <span className="material-icons-round text-blue-600">local_shipping</span>
            </span>
            Báo cáo Xuất kho
          </h1>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đơn xuất', value: stats.total_so.toLocaleString(), icon: 'outbox', color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Doanh thu', value: fmtMoney(stats.total_revenue), icon: 'trending_up', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Đã thu', value: fmtMoney(stats.total_paid), icon: 'check_circle', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Còn công nợ', value: fmtMoney(stats.total_debt), icon: 'account_balance_wallet', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-border-light rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} flex-shrink-0`}>
              <span className={`material-icons-round ${s.color}`}>{s.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider truncate">{s.label}</p>
              <p className={`text-base font-extrabold ${s.color} truncate`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-border-light rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Từ ngày giao</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Đến ngày giao</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Trạng thái</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary bg-white">
              <option value="">Tất cả</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tìm kiếm</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 text-sm">search</span>
                <input type="text" placeholder="Mã SO, khách hàng..." value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilter()}
                  className="w-full pl-9 pr-4 py-1.5 border border-border-light rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={applyFilter}
                className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">Lọc</button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-light flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Danh sách đơn xuất
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {totalCount > 0 ? `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, totalCount)} / ${totalCount} đơn` : '0 đơn'}
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400">
              <div className="inline-block w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
              <p className="text-sm font-medium">Đang tải...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-extrabold text-slate-400">
                  <th className="px-5 py-2 border-b border-border-light">Mã SO</th>
                  <th className="px-5 py-2 border-b border-border-light">Ngày đặt</th>
                  <th className="px-5 py-2 border-b border-border-light">Ngày giao</th>
                  <th className="px-5 py-2 border-b border-border-light">Khách hàng</th>
                  <th className="px-5 py-2 border-b border-border-light">Hãng VC</th>
                  <th className="px-5 py-2 border-b border-border-light text-center">Trạng thái</th>
                  <th className="px-5 py-2 border-b border-border-light text-right">Tổng tiền</th>
                  <th className="px-5 py-2 border-b border-border-light text-center">Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400 italic">Không có dữ liệu</td></tr>
                ) : rows.map(r => (
                  <tr key={r.so_code} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-1.5 font-mono text-xs font-bold text-primary">{r.so_code}</td>
                    <td className="px-5 py-1.5 text-slate-500 text-xs">{fmtDate(r.order_date)}</td>
                    <td className="px-5 py-1.5 text-slate-700 text-xs font-medium">{fmtDate(r.shipped_date)}</td>
                    <td className="px-5 py-1.5 font-medium text-slate-700 text-xs max-w-[180px] truncate">{r.customer_name}</td>
                    <td className="px-5 py-1.5 text-slate-500 text-xs">{r.carrier}</td>
                    <td className="px-5 py-1.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_LABEL[r.status]?.cls || 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABEL[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="px-5 py-1.5 text-right font-bold text-slate-700 text-xs">{fmtMoney(r.total_amount)}</td>
                    <td className="px-5 py-1.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PAY_LABEL[r.payment_status]?.cls || 'bg-slate-100 text-slate-500'}`}>
                        {PAY_LABEL[r.payment_status]?.label || r.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-3 border-t border-border-light bg-slate-50 flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <span className="material-icons-round text-sm">chevron_left</span>
            </button>
            {[...Array(totalPages)].map((_, i) => {
              const n = i + 1;
              if (n === 1 || n === totalPages || (n >= page-1 && n <= page+1))
                return <button key={n} onClick={() => setPage(n)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${n === page ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}`}>{n}</button>;
              if (n === page-2 || n === page+2)
                return <span key={n} className="text-slate-400">…</span>;
              return null;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <span className="material-icons-round text-sm">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutboundReport;
