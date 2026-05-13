import React, { useState, useEffect } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface HubAppProps {
  user: any;
}

interface ProductStock {
  product_code: string;
  product_long: string;
  unit: string;
  inbound_qty: number;
  outbound_qty: number;
  stock_qty: number;
}

const HubApp: React.FC<HubAppProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'nhan_hang' | 'giao_hang' | 'bao_cao'>('nhan_hang');
  const [loading, setLoading] = useState(false);

  // Inbound states
  const [poList, setPoList] = useState<any[]>([]);
  const [selectedPo, setSelectedPo] = useState<any | null>(null);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [poItemsLoading, setPoItemsLoading] = useState(false);

  // Outbound states
  const [soList, setSoList] = useState<any[]>([]);
  const [selectedSo, setSelectedSo] = useState<any | null>(null);

  // Stock report states
  const [stockReport, setStockReport] = useState<ProductStock[]>([]);

  // Messages / Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // ----------------------------------------------------
  // LOAD DATA FUNCTIONS
  // ----------------------------------------------------

  const loadInboundData = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from(TABLE('po'))
        .select('*')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      // Filter by warehouse if user is restricted to a warehouse
      if (user?.wh_code) {
        query = query.eq('wh_code', user.wh_code);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPoList(data || []);
    } catch (err: any) {
      console.error('Error fetching POs:', err);
      showAlert('Lỗi khi tải danh sách nhận hàng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOutboundData = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from(TABLE('so'))
        .select('*')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      // Filter by warehouse if user is restricted to a warehouse
      if (user?.wh_code) {
        query = query.eq('wh_code', user.wh_code);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setSoList(data || []);
    } catch (err: any) {
      console.error('Error fetching SOs:', err);
      showAlert('Lỗi khi tải danh sách giao hàng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch all products
      const { data: products, error: pErr } = await supabase
        .from(TABLE('product'))
        .select('product_code, product_long, unit')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      if (pErr) throw pErr;

      // 2. Fetch all PO items with their PO status and warehouse code
      const { data: poRecItems, error: poErr } = await supabase
        .from(TABLE('po_items'))
        .select(`
          product_code,
          received_qty,
          po:po_code ( status, wh_code )
        `);

      if (poErr) throw poErr;

      // 3. Fetch all SO items with their SO status and warehouse code
      const { data: soShipItems, error: soErr } = await supabase
        .from(TABLE('so_items'))
        .select(`
          product_code,
          qty,
          so:so_code ( status, wh_code )
        `);

      if (soErr) throw soErr;

      // Compute aggregates
      const productMap = new Map<string, ProductStock>();
      products?.forEach((p: any) => {
        productMap.set(p.product_code, {
          product_code: p.product_code,
          product_long: p.product_long,
          unit: p.unit || 'Cái',
          inbound_qty: 0,
          outbound_qty: 0,
          stock_qty: 0
        });
      });

      // Sum Inbounds (Received PO items)
      poRecItems?.forEach((item: any) => {
        const poStatus = item.po?.status;
        const poWhCode = item.po?.wh_code;

        // Filter by warehouse if user is restricted
        if (user?.wh_code && poWhCode !== user.wh_code) {
          return;
        }

        if (poStatus === 'received') {
          const prod = productMap.get(item.product_code);
          if (prod) {
            prod.inbound_qty += Number(item.received_qty) || 0;
          }
        }
      });

      // Sum Outbounds (Shipped SO items)
      soShipItems?.forEach((item: any) => {
        const soStatus = item.so?.status;
        const soWhCode = item.so?.wh_code;

        // Filter by warehouse if user is restricted
        if (user?.wh_code && soWhCode !== user.wh_code) {
          return;
        }

        if (soStatus === 'shipped' || soStatus === 'delivered' || soStatus === 'processing') {
          const prod = productMap.get(item.product_code);
          if (prod) {
            prod.outbound_qty += Number(item.qty) || 0;
          }
        }
      });

      // Calculate final stock and filter only products with stock > 0
      const finalReport = Array.from(productMap.values())
        .map(prod => ({
          ...prod,
          stock_qty: Math.max(0, prod.inbound_qty - prod.outbound_qty)
        }))
        .filter(prod => prod.stock_qty > 0);

      setStockReport(finalReport);
    } catch (err: any) {
      console.error('Error fetching report:', err);
      showAlert('Lỗi khi tải báo cáo: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'nhan_hang') {
      loadInboundData();
    } else if (activeTab === 'giao_hang') {
      loadOutboundData();
    } else if (activeTab === 'bao_cao') {
      loadReportData();
    }
    setSelectedPo(null);
    setSelectedSo(null);
  }, [activeTab]);

  // ----------------------------------------------------
  // INBOUND OPERATIONS
  // ----------------------------------------------------

  const openPoDetails = async (po: any) => {
    setSelectedPo(po);
    setPoItems([]);
    try {
      setPoItemsLoading(true);
      const { data, error } = await supabase
        .from(TABLE('po_items'))
        .select(`
          id,
          product_code,
          ordered_qty,
          received_qty,
          unit,
          product:product_code (
            product_long,
            sn_control
          )
        `)
        .eq('po_code', po.po_code);

      if (error) throw error;
      
      // Initialize with full receipt default for easy "older people" usage
      const initialized = (data || []).map((item: any) => ({
        ...item,
        input_received: item.received_qty || item.ordered_qty // Default to fully received
      }));
      
      setPoItems(initialized);
    } catch (err: any) {
      console.error('Error fetching PO items:', err);
      showAlert('Lỗi khi tải chi tiết đơn nhập: ' + err.message, 'error');
    } finally {
      setPoItemsLoading(false);
    }
  };

  const handleUpdateItemReceivedQty = (idx: number, delta: number) => {
    const updated = [...poItems];
    const item = updated[idx];
    const newQty = Math.max(0, Math.min(item.ordered_qty, item.input_received + delta));
    item.input_received = newQty;
    setPoItems(updated);
  };

  const handleSetFullyReceived = (idx: number) => {
    const updated = [...poItems];
    updated[idx].input_received = updated[idx].ordered_qty;
    setPoItems(updated);
  };

  const handleConfirmReceiveAll = () => {
    const updated = poItems.map(item => ({
      ...item,
      input_received: item.ordered_qty
    }));
    setPoItems(updated);
    showAlert('Đã tự động điền đầy đủ số lượng cho tất cả mặt hàng!', 'info');
  };

  const savePoReceipt = async () => {
    if (!selectedPo) return;
    try {
      setLoading(true);

      // 1. Update po_items received_qty in DB
      for (const item of poItems) {
        const { error } = await supabase
          .from(TABLE('po_items'))
          .update({ received_qty: item.input_received })
          .eq('id', item.id);

        if (error) throw error;
      }

      // 2. Set serial tracking entries to available for this PO
      const { error: snError } = await supabase
        .from(TABLE('serial_tracking'))
        .update({ status: 'available' })
        .eq('po_code', selectedPo.po_code);

      // We do not throw error here as PO might not have serial_tracking entries
      if (snError) {
        console.warn('Serial tracking update note:', snError.message);
      }

      // 3. Update PO status to received
      const { error: poError } = await supabase
        .from(TABLE('po'))
        .update({ 
          status: 'received', 
          actual_delivery: new Date().toISOString()
        })
        .eq('id', selectedPo.id);

      if (poError) throw poError;

      showAlert(`Đã NHẬN HÀNG thành công cho đơn ${selectedPo.po_code}!`, 'success');
      setSelectedPo(null);
      loadInboundData();
    } catch (err: any) {
      console.error('Error saving PO receipt:', err);
      showAlert('Lỗi khi xác nhận nhận hàng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // OUTBOUND OPERATIONS
  // ----------------------------------------------------

  const handleShipOrder = async (so: any) => {
    const isConfirmed = window.confirm(`Bạn có chắc chắn muốn GIAO ĐƠN HÀNG #${so.so_code} này cho Shipper không?`);
    if (!isConfirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from(TABLE('so'))
        .update({ status: 'shipped' })
        .eq('id', so.id);

      if (error) throw error;

      showAlert(`Đã GIAO ĐƠN ${so.so_code} cho Shipper thành công!`, 'success');
      loadOutboundData();
    } catch (err: any) {
      console.error('Error shipping SO:', err);
      showAlert('Lỗi khi giao đơn hàng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Assigned warehouse name state
  const [assignedWhName, setAssignedWhName] = useState<string>('Đang tải...');

  useEffect(() => {
    const fetchAssignedWarehouse = async () => {
      try {
        if (user?.wh_code) {
          const { data, error } = await supabase
            .from(TABLE('warehouse'))
            .select('wh_name')
            .eq('wh_code', user.wh_code)
            .maybeSingle();
          if (!error && data) {
            setAssignedWhName(`${data.wh_name} (${user.wh_code})`);
          } else {
            setAssignedWhName(user.wh_code);
          }
        } else if (user?.isSuperAdmin) {
          setAssignedWhName('Tất cả các kho (Super Admin)');
        } else {
          setAssignedWhName('Chưa phân kho');
        }
      } catch (err) {
        console.error('Error fetching assigned warehouse name:', err);
        setAssignedWhName(user?.wh_code || 'Chưa phân kho');
      }
    };
    fetchAssignedWarehouse();
  }, [user]);

  return (
    <div className="p-3 md:p-5 space-y-4 max-w-7xl mx-auto" style={{ fontFamily: 'Tahoma, Geneva, Verdana, sans-serif', lineHeight: '1.2' }}>
      {/* Title Header with Reduced Font and Padding */}
      <header className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase flex items-center gap-2">
            <span className="material-icons-round text-primary-light text-2xl">hub</span>
            Hub Quản Lý Đơn Hàng
          </h1>
          <p className="text-slate-400 font-bold mt-1 text-xs md:text-sm">Giao diện đơn giản - Phím bấm to, rõ ràng cho quản kho Hub</p>
        </div>
        
        {/* User and Warehouse Badge inside the Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-start md:self-auto w-full md:w-auto">
          {/* Assigned Warehouse Badge */}
          <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-4 py-2 rounded-xl border border-white/10 shadow-md">
            <span className="material-icons-round text-amber-400 text-xl">warehouse</span>
            <div>
              <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest">Kho quản lý</span>
              <span className="font-extrabold text-xs text-amber-300 uppercase tracking-tight">{assignedWhName}</span>
            </div>
          </div>

          {/* User Profile Name Badge */}
          <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors px-4 py-2 rounded-xl border border-white/20 shadow-md">
            <span className="material-icons-round text-emerald-400 text-xl">person</span>
            <div>
              <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest">Tài khoản</span>
              <span className="font-black text-xs text-white uppercase tracking-tight">{user?.full_name || 'Quản lý Hub'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Floating alert */}
      {alertMsg && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 max-w-sm animate-bounce ${
          alertMsg.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' :
          alertMsg.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-900' :
          'bg-blue-50 border-blue-500 text-blue-900'
        }`}>
          <span className="material-icons-round text-xl">
            {alertMsg.type === 'success' ? 'check_circle' : alertMsg.type === 'error' ? 'error' : 'info'}
          </span>
          <div>
            <h4 className="font-black text-sm">Thông báo</h4>
            <p className="font-bold text-xs mt-0.5 leading-tight">{alertMsg.text}</p>
          </div>
        </div>
      )}

      {/* THREE TABS */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <button
          onClick={() => setActiveTab('nhan_hang')}
          className={`flex flex-col md:flex-row items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
            activeTab === 'nhan_hang'
              ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg shadow-emerald-200 scale-101'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <span className={`material-icons-round text-xl md:text-2xl ${activeTab === 'nhan_hang' ? 'text-white' : 'text-emerald-600'}`}>download</span>
          <div className="text-center md:text-left">
            <div className="text-[9px] uppercase font-black opacity-70 tracking-widest">BƯỚC 1</div>
            <div className="text-sm md:text-base font-black uppercase">Nhận Hàng</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('giao_hang')}
          className={`flex flex-col md:flex-row items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
            activeTab === 'giao_hang'
              ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-200 scale-101'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <span className={`material-icons-round text-xl md:text-2xl ${activeTab === 'giao_hang' ? 'text-white' : 'text-blue-600'}`}>local_shipping</span>
          <div className="text-center md:text-left">
            <div className="text-[9px] uppercase font-black opacity-70 tracking-widest">BƯỚC 2</div>
            <div className="text-sm md:text-base font-black uppercase">Giao Hàng</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('bao_cao')}
          className={`flex flex-col md:flex-row items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
            activeTab === 'bao_cao'
              ? 'bg-amber-600 border-amber-700 text-white shadow-lg shadow-amber-200 scale-101'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <span className={`material-icons-round text-xl md:text-2xl ${activeTab === 'bao_cao' ? 'text-white' : 'text-amber-500'}`}>assessment</span>
          <div className="text-center md:text-left">
            <div className="text-[9px] uppercase font-black opacity-70 tracking-widest">XEM KHO</div>
            <div className="text-sm md:text-base font-black uppercase">Báo cáo tồn</div>
          </div>
        </button>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
        {loading && (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <h3 className="text-base font-black text-slate-700">Đang tải dữ liệu, xin chờ một chút...</h3>
          </div>
        )}

        {!loading && (
          <>
            {/* ---------------------------------------------------- */}
            {/* NHẬN HÀNG (INBOUND) TAB */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'nhan_hang' && !selectedPo && (
              <div className="p-4 md:p-6 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-900">
                  <span className="material-icons-round text-2xl text-emerald-600 font-black">help_outline</span>
                  <div>
                    <h3 className="text-sm font-black uppercase leading-tight">Hướng dẫn cho người già</h3>
                    <p className="text-xs font-bold text-emerald-800 mt-1">Khi xe tải của công ty chở hàng tới, hãy tìm mã đơn dưới đây và nhấn nút <span className="underline font-black">"BẤM NHẬN HÀNG"</span> màu xanh thật to bên cạnh đơn đó.</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-black uppercase">
                        <th className="p-3 md:p-4">Mã Đơn Nhập</th>
                        <th className="p-3 md:p-4">Ngày Gửi</th>
                        <th className="p-3 md:p-4">Nguồn Gửi</th>
                        <th className="p-3 md:p-4">Trạng Thái</th>
                        <th className="p-3 md:p-4 text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {poList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-extrabold text-sm">Không có đơn hàng nhập nào cần xử lý.</td>
                        </tr>
                      ) : (
                        poList.map((po) => (
                          <tr key={po.id} className="hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800">
                            <td className="p-3 md:p-4 font-mono text-sm font-black text-primary">{po.po_code}</td>
                            <td className="p-3 md:p-4">{po.order_date ? new Date(po.order_date).toLocaleDateString('vi-VN') : '---'}</td>
                            <td className="p-3 md:p-4 uppercase">{po.supplier_name || 'Công ty'}</td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                po.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-500 border-slate-300'
                              }`}>
                                {po.status === 'pending' ? 'Chờ Nhận' : 'Đã Nhận Hàng'}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 text-center">
                              {po.status === 'pending' ? (
                                <button
                                  onClick={() => openPoDetails(po)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-lg shadow-md hover:scale-101 transition-all flex items-center justify-center gap-1.5 text-xs uppercase"
                                >
                                  <span className="material-icons-round text-sm">download</span>
                                  Bấm nhận hàng
                                </button>
                              ) : (
                                <button
                                  onClick={() => openPoDetails(po)}
                                  className="w-full bg-slate-100 text-slate-500 font-bold py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-200 transition-all text-[11px] uppercase"
                                >
                                  Xem chi tiết
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* INBOUND DETAIL PANEL */}
            {activeTab === 'nhan_hang' && selectedPo && (
              <div className="p-4 md:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedPo(null)}
                      className="text-primary hover:underline font-black text-sm flex items-center gap-1.5 mb-1"
                    >
                      <span className="material-icons-round text-base">arrow_back</span> QUAY LẠI DANH SÁCH ĐƠN
                    </button>
                    <h2 className="text-lg md:text-xl font-black text-slate-900">NHẬN HÀNG ĐƠN: #{selectedPo.po_code}</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase">Nguồn gửi: {selectedPo.supplier_name || 'CÔNG TY'}</p>
                  </div>
                  
                  {selectedPo.status === 'pending' && (
                    <button
                      onClick={handleConfirmReceiveAll}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 uppercase self-start md:self-auto"
                    >
                      <span className="material-icons-round text-sm">done_all</span> Nhận tất cả mặt hàng
                    </button>
                  )}
                </div>

                {poItemsLoading ? (
                  <div className="p-6 text-center">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-1.5"></div>
                    <p className="font-bold text-xs text-slate-500">Đang tải danh sách hàng hóa...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Vui lòng kiểm tra và điền số lượng nhận thực tế</h3>

                    <div className="grid grid-cols-1 gap-4">
                      {poItems.map((item, idx) => (
                        <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase">{item.product_code}</span>
                            <h4 className="text-sm font-black text-slate-800 leading-tight uppercase">{item.product?.product_long || 'Tên sản phẩm'}</h4>
                            <p className="text-xs text-slate-500 font-bold">Số lượng yêu cầu từ công ty: <span className="font-black text-slate-900 text-sm">{item.ordered_qty} {item.unit}</span></p>
                          </div>

                          {selectedPo.status === 'pending' ? (
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Quantity Editor with giant buttons */}
                              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border-2 border-slate-300 shadow-inner">
                                <button
                                  onClick={() => handleUpdateItemReceivedQty(idx, -1)}
                                  className="w-10 h-10 bg-rose-100 hover:bg-rose-200 active:scale-95 transition-all text-rose-700 font-black text-xl rounded-lg flex items-center justify-center border border-rose-300"
                                >
                                  -
                                </button>
                                <div className="w-14 text-center">
                                  <span className="text-lg font-black text-slate-900">{item.input_received}</span>
                                  <span className="block text-[9px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                </div>
                                <button
                                  onClick={() => handleUpdateItemReceivedQty(idx, 1)}
                                  className="w-10 h-10 bg-emerald-100 hover:bg-emerald-200 active:scale-95 transition-all text-emerald-700 font-black text-xl rounded-lg flex items-center justify-center border border-emerald-300"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                onClick={() => handleSetFullyReceived(idx)}
                                className={`py-2.5 px-4 rounded-xl font-black text-xs transition-all ${
                                  item.input_received === item.ordered_qty
                                    ? 'bg-emerald-100 border border-emerald-400 text-emerald-800'
                                    : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-sm'
                                }`}
                              >
                                NHẬN ĐỦ ({item.ordered_qty})
                              </button>
                            </div>
                          ) : (
                            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-800 font-black text-sm">
                              Đã nhận thực tế: {item.received_qty} / {item.ordered_qty} {item.unit}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {selectedPo.status === 'pending' && (
                      <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                        <button
                          onClick={() => setSelectedPo(null)}
                          className="bg-white hover:bg-slate-100 text-slate-500 font-black py-3 px-6 rounded-xl border-2 border-slate-200 text-sm uppercase active:scale-95 transition-all"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          onClick={savePoReceipt}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-8 rounded-xl text-sm uppercase active:scale-95 transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-lg font-black">check_circle</span>
                          Xác nhận hoàn thành nhập kho
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* GIAO HÀNG (OUTBOUND) TAB */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'giao_hang' && (
              <div className="p-4 md:p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 text-blue-900">
                  <span className="material-icons-round text-2xl text-blue-600 font-black">help_outline</span>
                  <div>
                    <h3 className="text-sm font-black uppercase leading-tight">Hướng dẫn cho người già</h3>
                    <p className="text-xs font-bold text-blue-800 mt-1">Khi Shipper tới nhận hàng mang đi giao cho khách, hãy tìm đúng mã đơn và nhấn nút <span className="underline font-black">"GIAO CHO SHIPPER"</span> màu xanh nước biển thật to bên cạnh đơn đó.</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-black uppercase">
                        <th className="p-3 md:p-4">Đơn Khách Hàng</th>
                        <th className="p-3 md:p-4">Khách Hàng / SĐT</th>
                        <th className="p-3 md:p-4">Địa Chỉ Giao</th>
                        <th className="p-3 md:p-4">Trạng Thái</th>
                        <th className="p-3 md:p-4 text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {soList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-extrabold text-sm">Không có đơn hàng xuất nào cần giao.</td>
                        </tr>
                      ) : (
                        soList.map((so) => (
                          <tr key={so.id} className="hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800">
                            <td className="p-3 md:p-4 font-mono text-sm font-black text-primary">{so.so_code}</td>
                            <td className="p-3 md:p-4">
                              <div className="font-black text-slate-800">{so.customer_name}</div>
                              <div className="text-[11px] font-bold text-slate-500">{so.customer_phone}</div>
                            </td>
                            <td className="p-3 md:p-4 text-[11px] text-slate-600 max-w-xs truncate" title={so.delivery_address}>{so.delivery_address}</td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                so.status === 'shipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' :
                                so.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                'bg-blue-50 text-blue-700 border-blue-300'
                              }`}>
                                {so.status === 'shipped' ? 'Đã giao Shipper' :
                                 so.status === 'delivered' ? 'Thành công' :
                                 'Sẵn sàng giao'}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 text-center">
                              {so.status === 'pending' || so.status === 'processing' || so.status === 'new' ? (
                                <button
                                  onClick={() => handleShipOrder(so)}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-lg shadow-md hover:scale-101 transition-all flex items-center justify-center gap-1.5 text-xs uppercase"
                                >
                                  <span className="material-icons-round text-sm">local_shipping</span>
                                  Giao cho shipper
                                </button>
                              ) : (
                                <span className="text-slate-400 font-bold text-xs italic">Đã giao đi</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* BÁO CÁO XUẤT NHẬP TỒN (REPORT) TAB */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'bao_cao' && (
              <div className="p-4 md:p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-900">
                  <span className="material-icons-round text-2xl text-amber-600 font-black">help_outline</span>
                  <div>
                    <h3 className="text-sm font-black uppercase leading-tight">Hướng dẫn cho người già</h3>
                    <p className="text-xs font-bold text-amber-800 mt-1">Bảng dưới đây hiển thị số lượng hàng hóa thực tế đang có trong kho của bạn. <span className="font-black text-rose-600 underline">"Tồn Hiện Tại"</span> là số lượng hộp đang nằm trong kho.</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-black uppercase">
                        <th className="p-3 md:p-4">Mã Sản Phẩm</th>
                        <th className="p-3 md:p-4">Tên Sản Phẩm</th>
                        <th className="p-3 md:p-4 text-center">ĐVT</th>
                        <th className="p-3 md:p-4 text-right text-emerald-700">Tổng Nhập</th>
                        <th className="p-3 md:p-4 text-right text-rose-700">Tổng Xuất</th>
                        <th className="p-3 md:p-4 text-right text-blue-700 bg-blue-50/50">Tồn Hiện Tại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs font-bold text-slate-800">
                      {stockReport.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-extrabold text-sm">Không có dữ liệu tồn kho.</td>
                        </tr>
                      ) : (
                        stockReport.map((row) => (
                          <tr key={row.product_code} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 md:p-4 font-mono font-black text-primary">{row.product_code}</td>
                            <td className="p-3 md:p-4 uppercase text-slate-700 text-xs md:text-sm leading-tight">{row.product_long}</td>
                            <td className="p-3 md:p-4 text-center text-slate-500 font-extrabold text-xs">{row.unit}</td>
                            <td className="p-3 md:p-4 text-right text-emerald-600 font-black">{row.inbound_qty}</td>
                            <td className="p-3 md:p-4 text-right text-rose-600 font-black">{row.outbound_qty}</td>
                            <td className="p-3 md:p-4 text-right text-blue-700 bg-blue-50/30 font-black text-base">{row.stock_qty}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HubApp;
