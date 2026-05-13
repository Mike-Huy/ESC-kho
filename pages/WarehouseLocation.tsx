import React, { useState, useEffect } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

type TabType = 'warehouse' | 'location';

const WarehouseLocation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('warehouse');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TabType>('warehouse');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Warehouse Form State
  const [whForm, setWhForm] = useState({
    wh_code: '',
    wh_name: '',
    wh_address: '',
    is_active: true
  });

  // Location Form State
  const [locForm, setLocForm] = useState({
    wh_code: '',
    location_code: '',
    location_name: '',
    location_upper: 'Tầng 1',
    location_length_cm: '',
    location_width_cm: '',
    location_height_cm: '',
    max_weight_kg: '',
    is_active: true
  });

  useEffect(() => {
    fetchWarehousesList();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchWarehousesList = async () => {
    try {
      let query = supabase
        .from(TABLE('warehouse'))
        .select('*')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('id', { ascending: true });

      const savedUser = localStorage.getItem('wms_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && !user.isSuperAdmin && user.wh_code) {
          query = query.eq('wh_code', user.wh_code);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        setWarehouses(data);
      }
    } catch (err) {
      console.error('Error pre-fetching warehouses:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const savedUser = localStorage.getItem('wms_user');
      let userWhCode = '';
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && !user.isSuperAdmin && user.wh_code) {
          userWhCode = user.wh_code;
        }
      }

      if (activeTab === 'warehouse') {
        let query = supabase
          .from(TABLE('warehouse'))
          .select('*')
          .contains('website_id', [APP_CONFIG.WEBSITE_ID])
          .order('id', { ascending: true });

        if (userWhCode) {
          query = query.eq('wh_code', userWhCode);
        }

        const { data, error } = await query;
        if (error) throw error;
        setWarehouses(data || []);
      } else {
        let query = supabase
          .from(TABLE('wh_location'))
          .select('*')
          .contains('website_id', [APP_CONFIG.WEBSITE_ID])
          .order('location_code', { ascending: true });

        if (userWhCode) {
          query = query.eq('wh_code', userWhCode);
        }

        const { data, error } = await query;
        if (error) throw error;
        setLocations(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewClick = () => {
    setEditingItem(null);
    setModalType(activeTab);
    
    if (activeTab === 'warehouse') {
      setWhForm({
        wh_code: '',
        wh_name: '',
        wh_address: '',
        is_active: true
      });
    } else {
      setLocForm({
        wh_code: warehouses.length > 0 ? warehouses[0].wh_code : '',
        location_code: '',
        location_name: '',
        location_upper: 'Tầng 1',
        location_length_cm: '',
        location_width_cm: '',
        location_height_cm: '',
        max_weight_kg: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleEditWarehouseClick = (wh: any) => {
    setEditingItem(wh);
    setModalType('warehouse');
    setWhForm({
      wh_code: wh.wh_code,
      wh_name: wh.wh_name,
      wh_address: wh.wh_address || '',
      is_active: wh.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleEditLocationClick = (loc: any) => {
    setEditingItem(loc);
    setModalType('location');
    setLocForm({
      wh_code: loc.wh_code,
      location_code: loc.location_code,
      location_name: loc.location_name || '',
      location_upper: loc.location_upper || 'Tầng 1',
      location_length_cm: loc.location_length_cm?.toString() || '',
      location_width_cm: loc.location_width_cm?.toString() || '',
      location_height_cm: loc.location_height_cm?.toString() || '',
      max_weight_kg: loc.max_weight_kg?.toString() || '',
      is_active: loc.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleDeleteWarehouse = async (wh: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa kho "${wh.wh_name}" (${wh.wh_code})?\nLưu ý: Thao tác này có thể bị chặn nếu có dữ liệu liên kết khác trong hệ thống.`)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from(TABLE('warehouse'))
        .delete()
        .eq('id', wh.id);

      if (error) throw error;
      alert('Xóa kho thành công!');
      fetchData();
      fetchWarehousesList();
    } catch (err: any) {
      console.error('Error deleting warehouse:', err);
      alert('Không thể xóa kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (loc: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vị trí "${loc.location_name}" (${loc.location_code})?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from(TABLE('wh_location'))
        .delete()
        .eq('id', loc.id);

      if (error) throw error;
      alert('Xóa vị trí thành công!');
      fetchData();
    } catch (err: any) {
      console.error('Error deleting location:', err);
      alert('Không thể xóa vị trí: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whForm.wh_code || !whForm.wh_name) {
      alert('Vui lòng nhập đầy đủ Mã kho và Tên kho!');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingItem) {
        // Edit mode
        const { error } = await supabase
          .from(TABLE('warehouse'))
          .update({
            wh_name: whForm.wh_name,
            wh_address: whForm.wh_address,
            is_active: whForm.is_active
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        alert('Cập nhật kho thành công!');
      } else {
        // Insert mode
        const { error } = await supabase
          .from(TABLE('warehouse'))
          .insert([{
            wh_code: whForm.wh_code.trim().toUpperCase(),
            wh_name: whForm.wh_name,
            wh_address: whForm.wh_address,
            is_active: whForm.is_active,
            website_id: [APP_CONFIG.WEBSITE_ID]
          }]);

        if (error) throw error;
        alert('Thêm kho mới thành công!');
      }

      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
      fetchWarehousesList();
    } catch (err: any) {
      console.error('Error saving warehouse:', err);
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locForm.wh_code || !locForm.location_code || !locForm.location_name) {
      alert('Vui lòng nhập Mã kho, Mã vị trí và Tên vị trí!');
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedLen = locForm.location_length_cm ? parseFloat(locForm.location_length_cm) : null;
      const parsedWid = locForm.location_width_cm ? parseFloat(locForm.location_width_cm) : null;
      const parsedHei = locForm.location_height_cm ? parseFloat(locForm.location_height_cm) : null;
      const parsedWei = locForm.max_weight_kg ? parseFloat(locForm.max_weight_kg) : null;

      if (editingItem) {
        // Edit mode
        const { error } = await supabase
          .from(TABLE('wh_location'))
          .update({
            wh_code: locForm.wh_code,
            location_name: locForm.location_name,
            location_upper: locForm.location_upper,
            location_length_cm: parsedLen,
            location_width_cm: parsedWid,
            location_height_cm: parsedHei,
            max_weight_kg: parsedWei,
            is_active: locForm.is_active
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        alert('Cập nhật vị trí thành công!');
      } else {
        // Insert mode
        const { error } = await supabase
          .from(TABLE('wh_location'))
          .insert([{
            wh_code: locForm.wh_code,
            location_code: locForm.location_code.trim().toUpperCase(),
            location_name: locForm.location_name,
            location_upper: locForm.location_upper,
            location_length_cm: parsedLen,
            location_width_cm: parsedWid,
            location_height_cm: parsedHei,
            max_weight_kg: parsedWei,
            is_active: locForm.is_active,
            website_id: [APP_CONFIG.WEBSITE_ID]
          }]);

        if (error) throw error;
        alert('Thêm vị trí mới thành công!');
      }

      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Error saving location:', err);
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live searches
  const filteredWarehouses = warehouses.filter(wh => 
    wh.wh_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wh.wh_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (wh.wh_address && wh.wh_address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredLocations = locations.filter(loc => 
    loc.location_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (loc.wh_code && loc.wh_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (loc.location_upper && loc.location_upper.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">QUẢN LÝ KHO & VỊ TRÍ</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Thiết lập cấu trúc kho hàng và ô kệ chi tiết</p>
        </div>
        <button 
          onClick={handleAddNewClick}
          className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 flex items-center gap-1.5 active:scale-95"
        >
          <span className="material-icons-round text-sm">add</span>
          THÊM MỚI {activeTab === 'warehouse' ? 'KHO' : 'VỊ TRÍ'}
        </button>
      </header>

      {/* Modern Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => { setActiveTab('warehouse'); setSearchTerm(''); }}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'warehouse' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            DANH SÁCH KHO
          </button>
          <button 
            onClick={() => { setActiveTab('location'); setSearchTerm(''); }}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'location' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            VỊ TRÍ Ô KỆ
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder={activeTab === 'warehouse' ? "Tìm kiếm mã kho, tên kho..." : "Tìm vị trí, tầng, kho..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {activeTab === 'warehouse' ? (
                    <>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Kho</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Kho</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa Chỉ</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao Tác</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kho</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Vị Trí</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Vị Trí</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tầng / Mức</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kích Thước (cm)</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao Tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTab === 'warehouse' ? (
                  filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">Không tìm thấy kho hàng nào</td>
                    </tr>
                  ) : (
                    filteredWarehouses.map((wh) => (
                      <tr key={wh.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-4">
                          <span className="text-xs font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg uppercase">{wh.wh_code}</span>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-sm font-black text-slate-700 uppercase">{wh.wh_name}</p>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-xs font-bold text-slate-500">{wh.wh_address || '---'}</p>
                        </td>
                        <td className="px-8 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            wh.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {wh.is_active !== false ? 'HOẠT ĐỘNG' : 'TẠM KHÓA'}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleEditWarehouseClick(wh)}
                              className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm"
                              title="Sửa thông tin"
                            >
                              <span className="material-icons-round text-sm">edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteWarehouse(wh)}
                              className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center shadow-sm"
                              title="Xóa kho"
                            >
                              <span className="material-icons-round text-sm">delete_outline</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  filteredLocations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium">Không tìm thấy vị trí ô kệ nào</td>
                    </tr>
                  ) : (
                    filteredLocations.map((loc) => {
                      const associatedWh = warehouses.find(w => w.wh_code === loc.wh_code);
                      return (
                        <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{associatedWh?.wh_name || loc.wh_code}</span>
                          </td>
                          <td className="px-8 py-4">
                            <span className="text-xs font-black text-slate-900 uppercase bg-slate-100/60 px-2 py-1 rounded-md">{loc.location_code}</span>
                          </td>
                          <td className="px-8 py-4">
                            <p className="text-sm font-black text-slate-700 uppercase">{loc.location_name}</p>
                          </td>
                          <td className="px-8 py-4">
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded uppercase">{loc.location_upper || '---'}</span>
                          </td>
                          <td className="px-8 py-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              {loc.location_length_cm || '?' } x {loc.location_width_cm || '?'} x {loc.location_height_cm || '?'}
                              {loc.max_weight_kg && <span className="text-slate-500 font-bold block mt-0.5">Tối đa: {loc.max_weight_kg}kg</span>}
                            </p>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm"
                                title="QR Code"
                              >
                                <span className="material-icons-round text-sm">qr_code</span>
                              </button>
                              <button 
                                onClick={() => handleEditLocationClick(loc)}
                                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm"
                                title="Sửa vị trí"
                              >
                                <span className="material-icons-round text-sm">edit</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteLocation(loc)}
                                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center shadow-sm"
                                title="Xóa vị trí"
                              >
                                <span className="material-icons-round text-sm">delete_outline</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide / Popup Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  {editingItem ? 'Cập Nhật' : 'Thêm Mới'} {modalType === 'warehouse' ? 'Kho Hàng' : 'Vị Trí Ô Kệ'}
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {editingItem ? 'Thay đổi thông tin bản ghi hiện tại' : 'Khởi tạo thông tin dữ liệu mới'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center shadow-sm"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            {/* Modal Body Form */}
            {modalType === 'warehouse' ? (
              <form onSubmit={handleWarehouseSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Mã Kho (Không trùng lặp, Ví dụ: KHO_HCM)</label>
                    <input 
                      type="text" 
                      value={whForm.wh_code}
                      disabled={editingItem !== null}
                      onChange={(e) => setWhForm({...whForm, wh_code: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700 disabled:opacity-50" 
                      placeholder="KHO_NEW" 
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Tên Kho Hàng</label>
                    <input 
                      type="text" 
                      value={whForm.wh_name}
                      onChange={(e) => setWhForm({...whForm, wh_name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                      placeholder="Kho Sài Gòn 2" 
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Địa Chỉ</label>
                    <textarea 
                      value={whForm.wh_address}
                      onChange={(e) => setWhForm({...whForm, wh_address: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700 min-h-[80px]" 
                      placeholder="Địa chỉ chi tiết của kho..." 
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-2 px-1">
                    <input 
                      type="checkbox"
                      id="wh_is_active"
                      checked={whForm.is_active}
                      onChange={(e) => setWhForm({...whForm, is_active: e.target.checked})}
                      className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                    />
                    <label htmlFor="wh_is_active" className="text-xs font-bold text-slate-700 uppercase cursor-pointer select-none">Kho hoạt động bình thường</label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    HỦY BỎ
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] px-6 py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'ĐANG LƯU...' : 'XÁC NHẬN LƯU'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLocationSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[70vh]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Thuộc Kho Hàng (Bắt buộc)</label>
                    <select 
                      value={locForm.wh_code}
                      onChange={(e) => setLocForm({...locForm, wh_code: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700"
                      required
                    >
                      <option value="">Chọn kho hàng...</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.wh_code}>{wh.wh_name} ({wh.wh_code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Mã Vị Trí (Ví dụ: A-01-01)</label>
                      <input 
                        type="text" 
                        value={locForm.location_code}
                        disabled={editingItem !== null}
                        onChange={(e) => setLocForm({...locForm, location_code: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700 disabled:opacity-50" 
                        placeholder="A-01-01" 
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Tên Vị Trí</label>
                      <input 
                        type="text" 
                        value={locForm.location_name}
                        onChange={(e) => setLocForm({...locForm, location_name: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                        placeholder="Kệ A - Hàng 1 - Ô 1" 
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Tầng / Mức</label>
                      <input 
                        type="text" 
                        value={locForm.location_upper}
                        onChange={(e) => setLocForm({...locForm, location_upper: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                        placeholder="Tầng 1" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Trọng Lượng Tối Đa (kg)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={locForm.max_weight_kg}
                        onChange={(e) => setLocForm({...locForm, max_weight_kg: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                        placeholder="500" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Dài (cm)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={locForm.location_length_cm}
                        onChange={(e) => setLocForm({...locForm, location_length_cm: e.target.value})}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                        placeholder="120" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Rộng (cm)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={locForm.location_width_cm}
                        onChange={(e) => setLocForm({...locForm, location_width_cm: e.target.value})}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                        placeholder="100" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Cao (cm)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={locForm.location_height_cm}
                        onChange={(e) => setLocForm({...locForm, location_height_cm: e.target.value})}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                        placeholder="150" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2 px-1">
                    <input 
                      type="checkbox"
                      id="loc_is_active"
                      checked={locForm.is_active}
                      onChange={(e) => setLocForm({...locForm, is_active: e.target.checked})}
                      className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                    />
                    <label htmlFor="loc_is_active" className="text-xs font-bold text-slate-700 uppercase cursor-pointer select-none">Vị trí khả dụng</label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    HỦY BỎ
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] px-6 py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'ĐANG LƯU...' : 'XÁC NHẬN LƯU'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseLocation;
