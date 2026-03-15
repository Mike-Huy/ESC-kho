import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface Role {
  id: number;
  name: string;
  label: string;
  description: string | null;
  color: string;
}

interface Permission {
  id?: number;
  role_id: number;
  module: string;
  can_read: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_add: boolean;
}

interface StaffMember {
  id: number;
  full_name: string;
  erp_role_id: number | null;
}

const modules = [
  { id: 'inbound', label: '1. Đơn nhập' },
  { id: 'orders', label: '2. Xử lý đơn' },
  { id: 'outbound', label: '3. Đơn xuất' },
  { id: 'inventory', label: '4. Kho hàng' },
  { id: 'reports', label: '5. Báo cáo' },
  { id: 'operation', label: '6. Vận hành' },
  { id: 'hr', label: '7. Nhân sự' },
  { id: 'finance', label: '8. Tài chính' },
];

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rolesData } = await supabase.from('erp_roles').select('*').order('level', { ascending: true });
      const { data: staffData } = await supabase.from('users').select('id, full_name, staff_profiles(erp_role_id)').eq('user_type', 'staff');
      
      setRoles(rolesData || []);
      if (rolesData && rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
        fetchPermissions(rolesData[0].id);
      }

      const formattedStaff = staffData?.map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        erp_role_id: s.staff_profiles?.[0]?.erp_role_id || null
      })) || [];
      setStaff(formattedStaff);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (roleId: number) => {
    const { data } = await supabase.from('erp_role_permissions').select('*').eq('role_id', roleId);
    
    // Ensure all modules are represented in the state
    const existingPerms = data || [];
    const fullPerms = modules.map(mod => {
      const existing = existingPerms.find(p => p.module === mod.id);
      return existing || {
        role_id: roleId,
        module: mod.id,
        can_read: false,
        can_edit: false,
        can_delete: false,
        can_add: false
      };
    });
    setPermissions(fullPerms);
  };

  const handleTogglePermission = (module: string, field: keyof Permission) => {
    setPermissions(prev => prev.map(p => {
      if (p.module === module) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    }));
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      for (const perm of permissions) {
        if (perm.id) {
          await supabase.from('erp_role_permissions').update({
            can_read: perm.can_read,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            can_add: perm.can_add
          }).eq('id', perm.id);
        } else {
          await supabase.from('erp_role_permissions').insert({
            ...perm,
            website_id: APP_CONFIG.WEBSITE_ID
          });
        }
      }
      alert('Đã lưu phân quyền thành công!');
      fetchPermissions(selectedRole.id);
    } catch (err) {
      console.error('Error saving permissions:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    fetchPermissions(role.id);
  };

  const assignRole = async (userId: number, roleId: number | null) => {
    try {
      await supabase.from('staff_profiles').update({ erp_role_id: roleId }).eq('user_id', userId);
      setStaff(prev => prev.map(s => s.id === userId ? { ...s, erp_role_id: roleId } : s));
    } catch (err) {
      console.error('Error assigning role:', err);
    }
  };

  if (loading) return <div className="p-8 text-center italic text-slate-500">Đang tải cấu hình phân quyền...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cấu hình Hệ thống & Phân quyền</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý chức năng xem, sửa, xóa dựa trên Vai trò người dùng</p>
        </div>
        <button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all">
          <span className="material-icons-round text-sm">add_moderator</span> Tạo vai trò mới
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Roles List */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Danh sách Vai trò</h3>
            </div>
            <div className="p-2 space-y-1">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleChange(role)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    selectedRole?.id === role.id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedRole?.id === role.id ? 'bg-white' : ''}`} style={{ backgroundColor: selectedRole?.id === role.id ? 'white' : role.color }}></div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{role.label}</p>
                    <p className={`text-[10px] ${selectedRole?.id === role.id ? 'text-blue-100' : 'text-slate-400'}`}>{role.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Permission Details */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setActiveTab('permissions')}
                  className={`text-sm font-bold pb-4 border-b-2 transition-all ${activeTab === 'permissions' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Thiết lập Quyền hạn
                </button>
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`text-sm font-bold pb-4 border-b-2 transition-all ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Nhân sự gán vào Role
                </button>
              </div>
              {activeTab === 'permissions' && (
                <button 
                  onClick={savePermissions}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                >
                  <span className="material-icons-round text-sm">{saving ? 'sync' : 'save'}</span> 
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              )}
            </div>

            <div className="flex-1 p-6">
              {activeTab === 'permissions' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                    <div className="flex items-center gap-2 text-primary">
                        <span className="material-icons-round text-sm">info</span>
                        <p className="text-xs font-bold uppercase tracking-wider">Lưu ý chuyên môn</p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Bạn đang cấu hình quyền hạn cho nhóm <b>{selectedRole?.label}</b>. Mọi thay đổi sẽ có hiệu lực ngay lập tức khi nhân viên thuộc nhóm này tải lại trang.
                    </p>
                  </div>

                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <th className="pb-4 pl-4">Phân hệ (Module)</th>
                        <th className="pb-4 text-center">Xem (Read)</th>
                        <th className="pb-4 text-center">Thêm (Create)</th>
                        <th className="pb-4 text-center">Sửa (Edit)</th>
                        <th className="pb-4 text-center">Xóa (Delete)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {permissions.map((p) => (
                        <tr key={p.module} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 pl-4">
                            <span className="text-sm font-bold text-slate-700">{modules.find(m => m.id === p.module)?.label}</span>
                          </td>
                          {['can_read', 'can_add', 'can_edit', 'can_delete'].map((field) => (
                            <td key={field} className="py-4 text-center">
                              <button
                                onClick={() => handleTogglePermission(p.module, field as keyof Permission)}
                                className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center mx-auto ${
                                  p[field as keyof Permission] 
                                    ? field === 'can_delete' ? 'bg-red-500 border-red-500 text-white' : 'bg-primary border-primary text-white'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                              >
                                {p[field as keyof Permission] && <span className="material-icons-round text-xs font-bold">check</span>}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative mb-6">
                    <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all" placeholder="Tìm tên nhân viên..." type="text" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {staff.map(person => (
                      <div key={person.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all group">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                <span className="material-icons-round">person</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">{person.full_name}</h4>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">ID: {person.id}</p>
                            </div>
                         </div>
                         <select 
                            className="bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer transition-all"
                            value={person.erp_role_id || ''}
                            onChange={(e) => assignRole(person.id, e.target.value ? parseInt(e.target.value) : null)}
                         >
                            <option value="">-- Chưa gán --</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                         </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
