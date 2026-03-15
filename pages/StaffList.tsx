import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

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

interface StaffListProps {
  onViewStaff: (id: number) => void;
}

const StaffList: React.FC<StaffListProps> = ({ onViewStaff }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  
  // Form fields
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    phone: '',
    deptId: ''
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch staff from users joined with staff_profiles and hr_departments
      // We filter for products belonging to current website_id
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
            hr_departments (
              name
            )
          )
        `)
        .eq('user_type', 'staff')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

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
            department: profile?.hr_departments?.name || '---',
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

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('hr_departments')
      .select('id, name')
      .order('name');
    if (!error && data) {
      setDepartments(data);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.fullName || !newStaff.phone || !newStaff.deptId) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingStaffId) {
        // Update mode
        // 1. Update users
        const { error: userError } = await supabase
          .from('users')
          .update({
            full_name: newStaff.fullName,
            phone: newStaff.phone
          })
          .eq('id', editingStaffId);
        
        if (userError) throw userError;

        // 2. Update staff_profiles
        const { error: profileError } = await supabase
          .from('staff_profiles')
          .update({
            dept_id: parseInt(newStaff.deptId)
          })
          .eq('user_id', editingStaffId);

        if (profileError) throw profileError;

        alert('Cập nhật thông tin thành công!');
      } else {
        // Insert mode
        // 1. Insert into users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([{
            full_name: newStaff.fullName,
            phone: newStaff.phone,
            pass: '123456',
            user_type: 'staff',
            website_id: [APP_CONFIG.WEBSITE_ID]
          }])
          .select()
          .single();

        if (userError) throw userError;

        // 2. Insert into staff_profiles
        const { error: profileError } = await supabase
          .from('staff_profiles')
          .insert([{
            user_id: userData.id,
            dept_id: parseInt(newStaff.deptId),
            website_id: [APP_CONFIG.WEBSITE_ID],
            position: 'Nhân viên'
          }]);

        if (profileError) throw profileError;
        alert('Thêm nhân viên thành công!');
      }

      // Reset and close
      setNewStaff({ fullName: '', phone: '', deptId: '' });
      setEditingStaffId(null);
      setIsAddModalOpen(false);
      fetchStaff();
      
    } catch (err: any) {
      console.error('Error saving staff:', err);
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân viên "${member.full_name}"?`)) return;

    try {
      setLoading(true);
      // Delete staff_profiles first (child table)
      const { error: pError } = await supabase.from('staff_profiles').delete().eq('user_id', member.id);
      if (pError) throw pError;

      // Delete user
      const { error: uError } = await supabase.from('users').delete().eq('id', member.id);
      if (uError) throw uError;

      alert('Đã xóa nhân viên thành công!');
      fetchStaff();
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      alert('Lỗi khi xóa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (member: StaffMember) => {
    const originalItem = staff.find(s => s.id === member.id);
    const dept = departments.find(d => d.name === member.department);
    
    setNewStaff({
      fullName: member.full_name,
      phone: member.phone,
      deptId: dept?.id?.toString() || ''
    });
    setEditingStaffId(member.id);
    setIsAddModalOpen(true);
  };

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
            <button 
              onClick={() => {
                setEditingStaffId(null);
                setNewStaff({ fullName: '', phone: '', deptId: '' });
                setIsAddModalOpen(true);
              }}
              className="bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
                <span className="material-icons-round text-xs">person_add</span> Thêm nhân viên
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
                  <th className="px-6 py-2">Nhân viên</th>
                  <th className="px-6 py-2">Số điện thoại</th>
                  <th className="px-6 py-2">Phòng ban</th>
                  <th className="px-6 py-2">Chức vụ</th>
                  <th className="px-6 py-2">Trạng thái</th>
                  <th className="px-6 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-1.5">
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
                    <td className="px-6 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-round text-xs text-slate-400">phone</span>
                        <span className="text-sm text-slate-600 font-medium">{member.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 inline-block border border-blue-100">
                        {member.department}
                      </span>
                    </td>
                    <td className="px-6 py-1.5">
                      <span className="text-sm text-slate-600 font-semibold">{member.position}</span>
                    </td>
                    <td className="px-6 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className="text-xs font-bold text-emerald-600">{member.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onViewStaff(member.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-all"
                          title="Xem hồ sơ"
                        >
                          <span className="material-icons-round text-lg">contact_page</span>
                        </button>
                        <button 
                          onClick={() => handleEditClick(member)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-primary hover:shadow-sm transition-all"
                          title="Sửa thông tin"
                        >
                          <span className="material-icons-round text-lg">edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(member)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm transition-all"
                          title="Xóa nhân viên"
                        >
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

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
               <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase">{editingStaffId ? 'CẬP NHẬT NHÂN VIÊN' : 'THÊM NHÂN VIÊN MỚI'}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{editingStaffId ? 'Chỉnh sửa thông tin tài khoản' : 'Khởi tạo tài khoản nhân sự mới'}</p>
               </div>
               <button 
                 onClick={() => setIsAddModalOpen(false)}
                 className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center"
               >
                 <span className="material-icons-round">close</span>
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
               <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Tên nhân viên (Bắt buộc)</label>
                    <input 
                      type="text" 
                      value={newStaff.fullName}
                      onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                      placeholder="Nguyễn Văn A" 
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Phòng ban (Bắt buộc)</label>
                    <select 
                      value={newStaff.deptId}
                      onChange={(e) => setNewStaff({...newStaff, deptId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700"
                      required
                    >
                      <option value="">Chọn phòng ban...</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 px-1">Số điện thoại (Bắt buộc)</label>
                    <input 
                      type="tel" 
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700" 
                      placeholder="09xx.xxx.xxx"
                      required
                    />
                  </div>
               </div>

               <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
                  <span className="material-icons-round text-amber-500">info</span>
                  <p className="text-[10px] font-bold text-amber-900 leading-relaxed uppercase">Mật khẩu mặc định sau khi tạo sẽ là: <span className="text-sm font-black underline">123456</span>. Nhân viên có thể đổi mật khẩu sau khi đăng nhập.</p>
               </div>

               <div className="pt-4 flex gap-3">
                 <button 
                   type="button"
                   onClick={() => setIsAddModalOpen(false)}
                   className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                 >
                   HỦY BỎ
                 </button>
                 <button 
                   type="submit"
                   disabled={isSubmitting}
                   className="flex-[2] px-6 py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                 >
                   {isSubmitting ? 'ĐANG XỬ LÝ...' : (editingStaffId ? 'CẬP NHẬT THÔNG TIN' : 'XÁC NHẬN THÊM MỚI')}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
