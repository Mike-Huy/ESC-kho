import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface Role {
  id: number;
  name: string;
  label: string;
  description: string | null;
  color: string;
  level: number;
}

interface Permission {
  id?: number;
  role_id?: number;
  user_id?: number;
  module: string;
  can_read: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface StaffMember {
  id: number;
  full_name: string;
  erp_role_id: number | null;
  is_super_admin?: boolean;
}

interface NewRoleForm {
  name: string;
  label: string;
  description: string;
  color: string;
}

const modules = [
  { id: 'inbound',   label: '1. Đơn nhập' },
  { id: 'orders',    label: '2. Xử lý đơn' },
  { id: 'outbound',  label: '3. Đơn xuất' },
  { id: 'inventory', label: '4. Kho hàng' },
  { id: 'reports',   label: '5. Báo cáo' },
  { id: 'operation', label: '6. Vận hành' },
  { id: 'hr',        label: '7. Nhân sự' },
  { id: 'finance',   label: '8. Tài chính' },
];

const ROLE_COLORS = ['#64748b','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#ec4899','#06b6d4'];

const DEFAULT_NEW_ROLE: NewRoleForm = { name: '', label: '', description: '', color: '#3b82f6' };

const RoleManagement: React.FC = () => {
  const [roles, setRoles]               = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions]   = useState<Permission[]>([]);
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<'permissions' | 'user_roles' | 'user_permissions'>('permissions');
  const [searchStaff, setSearchStaff]   = useState('');
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRole, setNewRole]           = useState<NewRoleForm>(DEFAULT_NEW_ROLE);
  const [creatingRole, setCreatingRole] = useState(false);

  // States for user direct permissions (Tab 3)
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState<StaffMember | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [searchStaffForPerms, setSearchStaffForPerms] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Roles
      const { data: rolesData } = await supabase
        .from('esc_erp_roles')
        .select('*')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('level', { ascending: true });

      // 2. Fetch Users and their staff profiles
      const { data: staffData } = await supabase
        .from('esc_users')
        .select('id, full_name, esc_staff_profiles(erp_role_id, is_super_admin)')
        .eq('user_type', 'staff')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      setRoles(rolesData || []);
      if (rolesData && rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
        fetchPermissions(rolesData[0].id);
      }

      const formattedStaff: StaffMember[] = (staffData || [])
        .map((s: any) => {
          const isSuper = s.esc_staff_profiles?.[0]?.is_super_admin === true;
          return {
            id: s.id,
            full_name: s.full_name,
            erp_role_id: s.esc_staff_profiles?.[0]?.erp_role_id || null,
            is_super_admin: isSuper,
          };
        })
        .filter(s => !s.is_super_admin); // AN/ẨN SUPER ADMIN theo yêu cầu

      setStaff(formattedStaff);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (roleId: number) => {
    const { data } = await supabase
      .from('esc_erp_role_permissions')
      .select('*')
      .eq('role_id', roleId);

    const existingPerms = data || [];
    const fullPerms = modules.map(mod => {
      const existing = existingPerms.find(p => p.module === mod.id);
      return existing || {
        role_id: roleId,
        module: mod.id,
        can_read: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
      };
    });
    setPermissions(fullPerms);
  };

  const handleTogglePermission = (module: string, field: keyof Permission) => {
    setPermissions(prev => prev.map(p =>
      p.module === module ? { ...p, [field]: !p[field as any] } : p
    ));
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      for (const perm of permissions) {
        if (perm.id) {
          await supabase.from('esc_erp_role_permissions').update({
            can_read: perm.can_read,
            can_add: perm.can_add,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
          }).eq('id', perm.id);
        } else {
          await supabase.from('esc_erp_role_permissions').insert({
            role_id: perm.role_id,
            module: perm.module,
            can_read: perm.can_read,
            can_add: perm.can_add,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            website_id: [APP_CONFIG.WEBSITE_ID],
          });
        }
      }
      alert('Đã lưu phân quyền vai trò thành công!');
      fetchPermissions(selectedRole.id);
    } catch (err) {
      console.error('Error saving permissions:', err);
      alert('Đã xảy ra lỗi khi lưu phân quyền vai trò.');
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
      // 1. Cập nhật role_id trong profile
      await supabase
        .from('esc_staff_profiles')
        .update({ erp_role_id: roleId })
        .eq('user_id', userId);

      // 2. Nếu gán vai trò mới, xóa toàn bộ cấu hình quyền riêng trong esc_user_permissions để tránh xung đột
      if (roleId !== null) {
        await supabase
          .from('esc_user_permissions')
          .delete()
          .eq('user_id', userId);
      }

      setStaff(prev => prev.map(s => s.id === userId ? { ...s, erp_role_id: roleId } : s));
      alert('Đã gán vai trò cho nhân sự thành công!');
    } catch (err) {
      console.error('Error assigning role:', err);
      alert('Gán vai trò thất bại.');
    }
  };

  // Logic gán QUYỀN trực tiếp cho USER (Tab 3)
  const fetchUserPermissions = async (userId: number) => {
    try {
      const { data } = await supabase
        .from('esc_user_permissions')
        .select('*')
        .eq('user_id', userId);

      const existingPerms = data || [];
      const fullPerms = modules.map(mod => {
        const existing = existingPerms.find(p => p.module === mod.id);
        return existing || {
          user_id: userId,
          module: mod.id,
          can_read: false,
          can_add: false,
          can_edit: false,
          can_delete: false,
        };
      });
      setUserPermissions(fullPerms);
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    }
  };

  const handleToggleUserPermission = (module: string, field: keyof Permission) => {
    setUserPermissions(prev => prev.map(p =>
      p.module === module ? { ...p, [field]: !p[field as any] } : p
    ));
  };

  const saveUserPermissions = async () => {
    if (!selectedStaffForPerms) return;
    setSaving(true);
    try {
      // 1. Xóa sạch các cấu hình quyền riêng cũ để upsert chuẩn xác
      await supabase
        .from('esc_user_permissions')
        .delete()
        .eq('user_id', selectedStaffForPerms.id);

      // 2. Chèn cấu hình quyền mới
      const toInsert = userPermissions.map(p => ({
        user_id: selectedStaffForPerms.id,
        module: p.module,
        can_read: p.can_read,
        can_add: p.can_add,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        website_id: [APP_CONFIG.WEBSITE_ID],
      }));

      const { error } = await supabase
        .from('esc_user_permissions')
        .insert(toInsert);

      if (error) throw error;

      // 3. Theo yêu cầu: "Nếu ROLE đã gán cho USER thì USER sẽ không còn ROLE đó"
      // Cập nhật erp_role_id về null trong database
      await supabase
        .from('esc_staff_profiles')
        .update({ erp_role_id: null })
        .eq('user_id', selectedStaffForPerms.id);

      // Cập nhật lại state locally
      setStaff(prev => prev.map(s => s.id === selectedStaffForPerms.id ? { ...s, erp_role_id: null } : s));

      alert(`Đã gán QUYỀN TRỰC TIẾP thành công cho nhân sự ${selectedStaffForPerms.full_name}. Tài khoản này đã gỡ bỏ vai trò cũ (nếu có) để ưu tiên áp dụng quyền riêng lẻ.`);
      fetchUserPermissions(selectedStaffForPerms.id);
    } catch (err) {
      console.error('Error saving user permissions:', err);
      alert('Đã xảy ra lỗi khi lưu quyền riêng cho nhân sự.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim() || !newRole.label.trim()) return;
    setCreatingRole(true);
    try {
      const nextLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level)) + 1 : 1;
      const { data, error } = await supabase
        .from('esc_erp_roles')
        .insert({
          name: newRole.name.trim().toLowerCase().replace(/\s+/g, '_'),
          label: newRole.label.trim(),
          description: newRole.description.trim() || null,
          color: newRole.color,
          level: nextLevel,
          website_id: [APP_CONFIG.WEBSITE_ID],
        })
        .select()
        .single();

      if (error) throw error;

      // Tạo permission mặc định toàn false cho role mới
      await supabase.from('esc_erp_role_permissions').insert(
        modules.map(m => ({
          role_id: data.id,
          module: m.id,
          can_read: false,
          can_add: false,
          can_edit: false,
          can_delete: false,
          website_id: [APP_CONFIG.WEBSITE_ID],
        }))
      );

      setShowNewRoleModal(false);
      setNewRole(DEFAULT_NEW_ROLE);
      await fetchData();
      handleRoleChange(data);
    } catch (err) {
      console.error('Error creating role:', err);
      alert('Tạo role thất bại, kiểm tra console.');
    } finally {
      setCreatingRole(false);
    }
  };

  const filteredStaff = staff.filter(s =>
    s.full_name.toLowerCase().includes(searchStaff.toLowerCase())
  );

  const filteredStaffForPerms = staff.filter(s =>
    s.full_name.toLowerCase().includes(searchStaffForPerms.toLowerCase())
  );

  if (loading) return (
    <div className="p-8 text-center italic text-slate-500">Đang tải cấu hình phân quyền...</div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cấu hình Hệ thống & Phân quyền</h1>
        </div>
        <button
          onClick={() => setShowNewRoleModal(true)}
          className="bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:-translate-y-0.5"
        >
          <span className="material-icons-round text-xs">add_moderator</span> Tạo vai trò mới
        </button>
      </div>

      {/* Main Single Row Full Width Layout */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[550px] flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('permissions')}
              className={`text-sm font-bold pb-4 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'permissions' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="material-icons-round text-sm">tune</span> 1- Cài ROLE
            </button>
            <button
              onClick={() => setActiveTab('user_roles')}
              className={`text-sm font-bold pb-4 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'user_roles' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="material-icons-round text-sm">supervisor_account</span> 2- gán ROLE cho USER
            </button>
            <button
              onClick={() => setActiveTab('user_permissions')}
              className={`text-sm font-bold pb-4 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'user_permissions' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="material-icons-round text-sm">admin_panel_settings</span> 3- gán QUYỀN cho USER
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 p-6">
          
          {/* TAB 1: Cài ROLE */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              {/* Role Selection Dropdown Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">Chọn Vai trò:</span>
                  <select
                    value={selectedRole?.id || ''}
                    onChange={e => {
                      const r = roles.find(x => x.id === Number(e.target.value));
                      if (r) handleRoleChange(r);
                    }}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[220px] cursor-pointer shadow-sm hover:border-slate-300 transition-all"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.label} ({r.name})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={savePermissions}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="material-icons-round text-lg">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình vai trò'}
                </button>
              </div>

              {selectedRole && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/60 flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: selectedRole.color }} />
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">
                      {selectedRole.label} <span className="text-slate-400 normal-case font-normal">— {selectedRole.name} · Level {selectedRole.level}</span>
                    </p>
                    {selectedRole.description && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedRole.description}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">Cấu hình phân quyền này áp dụng tự động cho toàn bộ nhân sự được gán Vai trò này.</p>
                  </div>
                </div>
              )}

              {/* Permissions Grid Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-3.5">Phân hệ (Module)</th>
                      <th className="px-6 py-3.5 text-center">Xem (Read)</th>
                      <th className="px-6 py-3.5 text-center">Thêm (Add)</th>
                      <th className="px-6 py-3.5 text-center">Sửa (Edit)</th>
                      <th className="px-6 py-3.5 text-center">Xóa (Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissions.map(p => (
                      <tr key={p.module} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-700">
                            {modules.find(m => m.id === p.module)?.label}
                          </span>
                        </td>
                        {(['can_read', 'can_add', 'can_edit', 'can_delete'] as const).map(field => (
                          <td key={field} className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleTogglePermission(p.module, field)}
                              className={`w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${
                                p[field]
                                  ? field === 'can_delete'
                                    ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20 scale-105'
                                    : 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              {p[field] && <span className="material-icons-round text-sm font-bold">check</span>}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: gán ROLE cho USER */}
          {activeTab === 'user_roles' && (
            <div className="space-y-4">
              <div className="relative max-w-md mb-6">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all placeholder-slate-400"
                  placeholder="Tìm kiếm nhân sự theo tên..."
                  type="text"
                  value={searchStaff}
                  onChange={e => setSearchStaff(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Nhân viên</th>
                      <th className="px-6 py-4">Vai trò hiện tại</th>
                      <th className="px-6 py-4 text-right">Gán vai trò mới</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map(person => {
                      const assignedRole = roles.find(r => r.id === person.erp_role_id);
                      return (
                        <tr key={person.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center text-slate-400 shadow-inner">
                                {assignedRole ? (
                                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: assignedRole.color }} />
                                ) : (
                                  <span className="material-icons-round text-slate-400 text-lg">person</span>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-800 leading-snug">{person.full_name}</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">Mã tài khoản: #{person.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {assignedRole ? (
                              <span 
                                className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                                style={{ 
                                  backgroundColor: `${assignedRole.color}15`,
                                  color: assignedRole.color,
                                  borderColor: `${assignedRole.color}30`
                                }}
                              >
                                {assignedRole.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-pink-50 text-pink-600 border-pink-100">
                                Quyền riêng lẻ (Không dùng Role)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <select
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer transition-all inline-block text-slate-700 min-w-[180px]"
                              value={person.erp_role_id || ''}
                              onChange={e => assignRole(person.id, e.target.value ? parseInt(e.target.value) : null)}
                            >
                              <option value="">-- Quyền riêng lẻ --</option>
                              {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredStaff.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic text-sm">
                  Không tìm thấy nhân viên nào phù hợp
                </div>
              )}
            </div>
          )}

          {/* TAB 3: gán QUYỀN cho USER */}
          {activeTab === 'user_permissions' && (
            <div className="space-y-6">
              {/* User Selector Dropdown Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">Chọn Nhân viên:</span>
                  <select
                    value={selectedStaffForPerms?.id || ''}
                    onChange={e => {
                      const staffId = Number(e.target.value);
                      const s = staff.find(x => x.id === staffId);
                      if (s) {
                        setSelectedStaffForPerms(s);
                        fetchUserPermissions(s.id);
                      } else {
                        setSelectedStaffForPerms(null);
                        setUserPermissions([]);
                      }
                    }}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[240px] cursor-pointer shadow-sm hover:border-slate-300 transition-all"
                  >
                    <option value="">-- Chọn nhân sự muốn gán quyền --</option>
                    {staff.map(s => {
                      const userRole = roles.find(r => r.id === s.erp_role_id);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.full_name} {userRole ? `[Role: ${userRole.label}]` : '[Quyền riêng]'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedStaffForPerms && (
                  <button
                    onClick={saveUserPermissions}
                    disabled={saving}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="material-icons-round text-lg">{saving ? 'sync' : 'save'}</span>
                    {saving ? 'Đang lưu...' : 'Lưu quyền riêng'}
                  </button>
                )}
              </div>

              {selectedStaffForPerms ? (
                <div className="space-y-6">
                  {/* Notice Alert */}
                  <div className="bg-pink-50 border border-pink-100/80 p-4 rounded-xl flex items-start gap-3">
                    <span className="material-icons-round text-pink-500 mt-0.5">warning</span>
                    <div>
                      <p className="text-xs font-bold text-pink-700 uppercase tracking-wider">
                        CHẾ ĐỘ GÁN QUYỀN RIÊNG CHO USER: {selectedStaffForPerms.full_name}
                      </p>
                      <p className="text-xs text-pink-600 mt-1 leading-relaxed">
                        Thiết lập chi tiết quyền Xem, Thêm, Sửa, Xóa mà không phụ thuộc vào ROLE. 
                        <strong> Ngay khi bạn bấm Lưu, nhân viên này sẽ tự động được gỡ khỏi vai trò (Role) hiện tại</strong> để áp dụng cấu hình độc lập này.
                      </p>
                    </div>
                  </div>

                  {/* Permissions Grid for User */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-6 py-3.5">Phân hệ (Module)</th>
                          <th className="px-6 py-3.5 text-center">Xem (Read)</th>
                          <th className="px-6 py-3.5 text-center">Thêm (Add)</th>
                          <th className="px-6 py-3.5 text-center">Sửa (Edit)</th>
                          <th className="px-6 py-3.5 text-center">Xóa (Delete)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userPermissions.map(p => (
                          <tr key={p.module} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-700">
                                {modules.find(m => m.id === p.module)?.label}
                              </span>
                            </td>
                            {(['can_read', 'can_add', 'can_edit', 'can_delete'] as const).map(field => (
                              <td key={field} className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleToggleUserPermission(p.module, field)}
                                  className={`w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${
                                    p[field]
                                      ? field === 'can_delete'
                                        ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20 scale-105'
                                        : 'bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-500/20 scale-105'
                                      : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                                >
                                  {p[field] && <span className="material-icons-round text-sm font-bold">check</span>}
                                </button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                  <span className="material-icons-round text-3xl text-slate-300 mb-2 block animate-pulse">admin_panel_settings</span>
                  <p className="text-sm font-bold">Vui lòng chọn một nhân viên để bắt đầu thiết lập quyền hạn trực tiếp</p>
                  <p className="text-xs text-slate-400 mt-1">Cài đặt trực tiếp sẽ bỏ qua và override toàn bộ cấu hình vai trò của nhân sự đó.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal tạo role mới */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Tạo Vai trò mới</h2>
              <p className="text-xs text-slate-500 mt-1">Cấu hình chi tiết quyền hạn của vai trò này sau khi tạo xong.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tên hiển thị *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VD: Trưởng kho"
                  value={newRole.label}
                  onChange={e => setNewRole(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tên hệ thống *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                  placeholder="VD: warehouse_manager"
                  value={newRole.name}
                  onChange={e => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-[10px] text-slate-400 mt-1">Viết thường, không dấu, ngăn cách bằng dấu gạch dưới.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Mô tả</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  rows={2}
                  placeholder="Mô tả ngắn về trách nhiệm vai trò này..."
                  value={newRole.description}
                  onChange={e => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Màu sắc nhận diện</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ROLE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewRole(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg transition-all ${newRole.color === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowNewRoleModal(false); setNewRole(DEFAULT_NEW_ROLE); }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creatingRole || !newRole.name.trim() || !newRole.label.trim()}
                className="px-4 py-2 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
              >
                {creatingRole && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Tạo vai trò
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
