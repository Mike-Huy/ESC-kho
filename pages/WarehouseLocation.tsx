import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

type TabType = 'warehouse' | 'location';

const WarehouseLocation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('warehouse');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'warehouse') {
        const { data, error } = await supabase
          .from('warehouse')
          .select('*')
          .order('id', { ascending: true });
        if (error) throw error;
        setWarehouses(data || []);
      } else {
        const { data, error } = await supabase
          .from('wh_location')
          .select('*')
          .contains('website_id', [APP_CONFIG.WEBSITE_ID])
          .order('location_code', { ascending: true });
        if (error) throw error;
        setLocations(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">QUẢN LÝ KHO & VỊ TRÍ</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Thiết lập cấu trúc kho hàng và ô kệ chi tiết</p>
        </div>
        <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2">
          <span className="material-icons-round text-lg">add</span>
          THÊM MỚI {activeTab === 'warehouse' ? 'KHO' : 'VỊ TRÍ'}
        </button>
      </header>

      {/* Modern Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('warehouse')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'warehouse' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          DANH SÁCH KHO
        </button>
        <button 
          onClick={() => setActiveTab('location')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'location' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          VỊ TRÍ Ô KỆ
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {activeTab === 'warehouse' ? (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Kho</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Kho</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa Chỉ</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao Tác</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Vị Trí</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Vị Trí</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tầng</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kích Thước (cm)</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao Tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTab === 'warehouse' ? (
                  warehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-4">
                        <span className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg uppercase">{wh.wh_code}</span>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-sm font-black text-slate-700 uppercase">{wh.wh_name}</p>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-xs font-bold text-slate-500">{wh.wh_address || '---'}</p>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-primary hover:text-white transition-all">
                          <span className="material-icons-round text-sm">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-4">
                        <span className="text-xs font-black text-slate-900 uppercase">{loc.location_code}</span>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-sm font-black text-slate-700 uppercase">{loc.location_name}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">{loc.location_upper || '---'}</span>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {loc.location_length_cm}x{loc.location_width_cm}x{loc.location_height_cm}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-primary hover:text-white transition-all">
                              <span className="material-icons-round text-sm">qr_code</span>
                           </button>
                           <button className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-primary hover:text-white transition-all">
                              <span className="material-icons-round text-sm">edit</span>
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseLocation;
