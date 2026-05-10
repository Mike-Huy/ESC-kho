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
  role_id: number;
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
  const [activeTab, setActiveTab]       = useState<'permissions' | 'users'>('permissions');
  const [searchStaff, setSearchStaff]   = useState('');
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRole, setNewRole]           = useState<NewRoleForm>(DEFAULT_NEW_ROLE);
  const [creatingRole, setCreatingRole] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rolesData } = await supabase
        .from('esc_erp_roles')
        .select('*')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('level', { ascending: true });

      const { data: staffData } = await supabase
        .from('esc_users')
        .select('id, full_name, esc_staff_profiles(erp_role_id)')
        .eq('user_type', 'staff')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      setRoles(rolesData || []);
      if (rolesData && rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
        fetchPermissions(rolesData[0].id);
      }

      const formattedStaff: StaffMember[] = (staffData || []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        erp_role_id: s.esc_staff_profiles?.[0]?.erp_role_id || null,
      }));
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
      p.module === module ? { ...p, [field]: !p[field as keyof Permission] } : p
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
            ...perm,
            website_id: [APP_CONFIG.WEBSITE_ID],
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
      await supabase
        .from('esc_staff_profiles')
        .update({ erp_role_id: roleId })
        .eq('user_id', userId);
      setStaff(prev => prev.map(s => s.id === userId ? { ...s, erp_role_id: roleId } : s));
    } catch (err) {
      console.error('Error assigning role:', err);
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

  if (loading) return (
    <div className="p-8 text-center italic text-slate-500">Đang tải cấu hình phân quyền...</div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cấu hình Hệ thống & Phân quyền</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý chức năng xem, sửa, xóa dựa trên Vai trò người dùng</p>
        </div>
        <button
          onClick={() => setShowNewRoleModal(true)}
          className="bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
        >
          <span className="material-icons-round text-xs">add_moderator</span> Tạo vai trò mới
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
                    selectedRole?.id === role.id
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedRole?.id === role.id ? 'white' : role.color }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold truncate">{role.label}</p>
                    <p className={`text-[10px] truncate ${selectedRole?.id === role.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {role.name} · Lv.{role.level}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Role badge legend */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cấp độ</h3>
            {[
              { label: 'Khách hàng', color: '#64748b', desc: 'Chỉ xem đơn hàng' },
              { label: 'Nhân viên',  color: '#3b82f6', desc: 'Nhập/xuất kho' },
              { label: 'Trưởng nhóm',color: '#8b5cf6', desc: '+ Báo cáo, vận hành' },
              { label: 'Quản trị',   color: '#f59e0b', desc: '+ Nhân sự, tài chính' },
              { label: 'Super Admin', color: '#ef4444', desc: 'Toàn quyền' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div>
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  <span className="text-[10px] text-slate-400 ml-1">— {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
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
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all hover:-translate-y-0.5"
                >
                  <span className="material-icons-round text-xs">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              )}
            </div>

            <div className="flex-1 p-6">
              {activeTab === 'permissions' ? (
                <div className="space-y-4">
                  {selectedRole && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: selectedRole.color }} />
                      <div>
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">
                          {selectedRole.label} <span className="text-slate-400 normal-case font-normal">— {selectedRole.name}</span>
                        </p>
                        {selectedRole.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedRole.description}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">Mọi thay đổi có hiệu lực ngay khi nhân viên tải lại trang.</p>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <th className="py-2 pl-4">Phân hệ (Module)</th>
                        <th className="py-2 text-center">Xem</th>
                        <th className="py-2 text-center">Thêm</th>
                        <th className="py-2 text-center">Sửa</th>
                        <th className="py-2 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {permissions.map(p => (
                        <tr key={p.module} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pl-4">
                            <span className="text-sm font-bold text-slate-700">
                              {modules.find(m => m.id === p.module)?.label}
                            </span>
                          </td>
                          {(['can_read', 'can_add', 'can_edit', 'can_delete'] as const).map(field => (
                            <td key={field} className="py-3 text-center">
                              <button
                                onClick={() => handleTogglePermission(p.module, field)}
                                className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center mx-auto ${
                                  p[field]
                                    ? field === 'can_delete'
                                      ? 'bg-red-500 border-red-500 text-white'
                                      : 'bg-primary border-primary text-white'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                              >
                                {p[field] && <span className="material-icons-round text-xs font-bold">check</span>}
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
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                      placeholder="Tìm tên nhân viên..."
                      type="text"
                      value={searchStaff}
                      onChange={e => setSearchStaff(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStaff.map(person => {
                      const assignedRole = roles.find(r => r.id === person.erp_role_id);
                      return (
                        <div
                          key={person.id}
                          className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                              {assignedRole ? (
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: assignedRole.color }} />
                              ) : (
                                <span className="material-icons-round text-slate-400">person</span>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{person.full_name}</h4>
                              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: assignedRole?.color || '#94a3b8' }}>
                                {assignedRole?.label || 'Chưa gán role'}
                              </p>
                            </div>
                          </div>
                          <select
                            className="bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer transition-all"
                            value={person.erp_role_id || ''}
                            onChange={e => assignRole(person.id, e.target.value ? parseInt(e.target.value) : null)}
                          >
                            <option value="">-- Chưa gán --</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {filteredStaff.length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic text-sm">
                      Không tìm thấy nhân viên nào
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal tạo role mới */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Tạo Vai trò mới</h2>
              <p className="text-xs text-slate-500 mt-1">Sau khi tạo, cấu hình quyền hạn trong bảng bên trái</p>
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
                <p className="text-[10px] text-slate-400 mt-1">Chữ thường, không dấu, dùng dấu gạch dưới</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Mô tả</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  rows={2}
                  placeholder="Mô tả ngắn về vai trò này..."
                  value={newRole.description}
                  onChange={e => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Màu sắc</label>
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
