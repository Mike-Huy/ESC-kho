import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface StaffMember {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  department: string;
  position: string | null;
  avatar: string | null;
  status: string;
}

const StaffList: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch staff from users joined with staff_profiles and hr_departments
        // We filter for "Bộ phận KHO" (department id 9 or sub-depts)
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            phone,
            email,
            avatar,
            staff_profiles!inner (
              position,
              hr_departments!inner (
                name
              )
            )
          `)
          .eq('user_type', 'staff')
          .or('name.eq.Bộ Phận KHO,parent_id.eq.9', { foreignTable: 'staff_profiles.hr_departments' });

        if (error) {
          console.error('Error fetching staff:', error);
          setError('Không thể tải dữ liệu nhân viên. Vui lòng thử lại sau.');
          return;
        }

        if (data) {
          const formattedData = data.map((item: any) => {
            const profile = Array.isArray(item.staff_profiles) ? item.staff_profiles[0] : item.staff_profiles;
            return {
              id: item.id,
              full_name: item.full_name,
              phone: item.phone,
              email: item.email,
              avatar: item.avatar,
              department: profile?.hr_departments?.name || 'Bộ phận KHO', // Fallback to KHO since we filtered for it
              position: profile?.position || 'Nhân viên',
              status: 'Hoạt động'
            };
          });
          setStaff(formattedData);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Đã xảy ra lỗi không xác định.');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách Nhân viên - Bộ phận KHO</h1>
          <p className="text-sm text-slate-500 mt-1">Lấy dữ liệu trực tiếp từ hệ thống Supabase</p>
        </div>
        <div className="flex gap-3">
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                <span className="material-icons-round text-sm">filter_list</span> Bộ lọc
            </button>
            <button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all">
                <span className="material-icons-round text-sm">person_add</span> Thêm nhân viên
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium italic">Đang tải danh sách nhân viên...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
          <span className="material-icons-round text-4xl text-red-400 mb-2">error_outline</span>
          <p className="text-red-700 font-bold">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-200 transition-all"
          >
            Thử lại
          </button>
        </div>
      ) : staff.length === 0 ? (
        <div className="p-20 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-icons-round text-4xl text-slate-300">people_outline</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa có nhân viên nào</h3>
          <p className="text-slate-500 max-w-xs mx-auto">Hiện tại chưa có nhân viên nào được gán vào "Bộ phận KHO".</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <th className="px-6 py-4">Nhân viên</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Phòng ban</th>
                  <th className="px-6 py-4">Chức vụ</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center shadow-sm">
                          {member.avatar ? (
                            <img src={member.avatar} className="w-full h-full object-cover" alt={member.full_name} />
                          ) : (
                            <span className="material-icons-round text-slate-400">person</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{member.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{member.email || 'No Email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-round text-xs text-slate-400">phone</span>
                        <span className="text-sm text-slate-600 font-medium">{member.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 inline-block border border-blue-100">
                        {member.department}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-semibold">{member.position}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className="text-xs font-bold text-emerald-600">{member.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-primary hover:shadow-sm transition-all">
                          <span className="material-icons-round text-lg">edit</span>
                        </button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm transition-all">
                          <span className="material-icons-round text-lg">delete_outline</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Hiển thị {staff.length} nhân viên</p>
            <div className="flex items-center gap-2">
                <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center bg-white text-slate-400 hover:bg-slate-50 transition-all opacity-50 cursor-not-allowed">
                    <span className="material-icons-round text-sm">chevron_left</span>
                </button>
                <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center bg-white text-slate-400 hover:bg-slate-50 transition-all opacity-50 cursor-not-allowed">
                    <span className="material-icons-round text-sm">chevron_right</span>
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
