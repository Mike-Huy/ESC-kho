import React, { useEffect, useState } from 'react';
import { supabase, TABLE } from '../supabaseClient';
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
  has_direct_perms: boolean; // true nếu có quyền riêng trong esc_user_permissions
  is_super_admin?: boolean;
}

interface NewRoleForm {
  name: string;
  label: string;
  description: string;
  color: string;
}

const modules = [
  // 1. Đơn nhập
  { id: 'inbound', label: '1. Đơn nhập' },
  { id: 'inbound_new', label: 'Tạo hàng mới', isSub: true, parentId: 'inbound' },
  { id: 'inbound_list', label: 'Danh sách đơn', isSub: true, parentId: 'inbound' },
  { id: 'inbound_return', label: 'Hàng trả', isSub: true, parentId: 'inbound' },
  { id: 'inbound_internal', label: 'Xử lý nội bộ', isSub: true, parentId: 'inbound' },

  // 2. Đơn xuất & Xử lý đơn
  { id: 'outbound', label: '2. Đơn xuất' },
  { id: 'proc_pick', label: 'Soạn đơn', isSub: true, parentId: 'outbound' },
  { id: 'proc_pack', label: 'Đóng gói', isSub: true, parentId: 'outbound' },
  { id: 'proc_route', label: 'Xếp tuyến', isSub: true, parentId: 'outbound' },

  // 3. Kho hàng
  { id: 'inventory', label: '3. Kho hàng' },
  { id: 'wh_list', label: 'Danh sách kho', isSub: true, parentId: 'inventory' },
  { id: 'rackMap', label: 'Sơ đồ kho', isSub: true, parentId: 'inventory' },
  { id: 'wh_location', label: 'Vị trí kho', isSub: true, parentId: 'inventory' },

  // 4. Báo cáo
  { id: 'reports', label: '4. Báo cáo' },
  { id: 'rpt_inbound', label: 'Báo cáo nhập', isSub: true, parentId: 'reports' },
  { id: 'rpt_proc', label: 'BC xử lý đơn', isSub: true, parentId: 'reports' },
  { id: 'rpt_outbound', label: 'BC xuất', isSub: true, parentId: 'reports' },
  { id: 'inventory_xnt', label: 'Xuất - Nhập - Tồn', isSub: true, parentId: 'reports' },

  // 5. Vận hành
  { id: 'operation', label: '5. Vận hành' },
  { id: 'op_split', label: 'Rã hàng chẵn', isSub: true, parentId: 'operation' },
  { id: 'op_repack', label: 'Đóng gói lại', isSub: true, parentId: 'operation' },
  { id: 'op_audit', label: 'Kiểm kê kho', isSub: true, parentId: 'operation' },
  { id: 'op_replenish', label: 'Châm hàng', isSub: true, parentId: 'operation' },
  { id: 'op_transfer', label: 'Luân chuyển', isSub: true, parentId: 'operation' },

  // 6. Nhân sự
  { id: 'hr', label: '6. Nhân sự' },
  { id: 'hr_staff_list', label: 'DS nhân viên', isSub: true, parentId: 'hr' },
  { id: 'hr_salary_level', label: 'Cấp bậc lương', isSub: true, parentId: 'hr' },
  { id: 'hr_shifts', label: 'Ca làm việc', isSub: true, parentId: 'hr' },
  { id: 'staffCheckIn', label: 'Chấm công', isSub: true, parentId: 'hr' },
  { id: 'hr_policy', label: 'Chế độ', isSub: true, parentId: 'hr' },

  // 7. Tài chính
  { id: 'finance', label: '7. Tài chính' },
  { id: 'fin_wh', label: 'Chi phí kho', isSub: true, parentId: 'finance' },
  { id: 'fin_op', label: 'Chi phí vận hành', isSub: true, parentId: 'finance' },
  { id: 'fin_hr', label: 'Chi phí nhân sự', isSub: true, parentId: 'finance' },
  { id: 'fin_supplies', label: 'Vật tư tiêu hao', isSub: true, parentId: 'finance' },
  { id: 'fin_maint', label: 'Chi phí bảo trì', isSub: true, parentId: 'finance' },

  // 8. Danh mục
  { id: 'inventory_master', label: '8. Danh mục' },
  { id: 'product_list', label: 'Sản phẩm', isSub: true, parentId: 'inventory_master' },
  { id: 'supplier_list', label: 'Nhà cung cấp', isSub: true, parentId: 'inventory_master' },
  { id: 'customer_list', label: 'Khách hàng', isSub: true, parentId: 'inventory_master' },

  // 9. Cài đặt
  { id: 'settings', label: '9. Cài đặt' },
  { id: 'staffAdmin', label: 'Nhân viên', isSub: true, parentId: 'settings' },
  { id: 'set_permissions', label: 'Phân quyền', isSub: true, parentId: 'settings' },
  { id: 'set_salary', label: 'Lương', isSub: true, parentId: 'settings' },

  // 10. Road Map
  { id: 'roadmap', label: '10. Road Map' },
];

const ROLE_COLORS = ['#64748b','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#ec4899','#06b6d4'];
const DEFAULT_NEW_ROLE: NewRoleForm = { name: '', label: '', description: '', color: '#3b82f6' };

// Xác định xem một ô quyền lợi của parent hay child có nên được highlight (nổi bật) lên hay không
const isPermissionHighlighted = (perm: Permission, fullList: Permission[], moduleId: string, field: keyof Permission) => {
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return false;

  // Đối với Menu con: Luôn nổi bật nếu giá trị hiện tại là true
  if ('isSub' in mod && mod.isSub) {
    return !!perm[field];
  }

  // Đối với Menu cha: Chỉ nổi bật khi CHÍNH NÓ là true VÀ TOÀN BỘ CÁC MENU CON của nó cũng là true
  if (!perm[field]) return false;

  const childModules = modules.filter(m => 'parentId' in m && m.parentId === moduleId);
  if (childModules.length === 0) {
    return !!perm[field]; // Không có menu con (vd: roadmap)
  }

  const idKey = 'role_id' in perm ? 'role_id' : 'user_id';
  const idValue = perm[idKey as keyof Permission];

  return childModules.every(child => {
    const childPerm = fullList.find(cp => cp.module === child.id && cp[idKey as keyof Permission] === idValue);
    return childPerm ? !!childPerm[field] : false;
  });
};

const RoleManagement: React.FC = () => {
  const [roles, setRoles]               = useState<Role[]>([]);
  const [permissions, setPermissions]   = useState<Permission[]>([]);
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<'permissions' | 'user_roles' | 'user_permissions'>('permissions');
  const [searchStaff, setSearchStaff]   = useState('');
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRole, setNewRole]           = useState<NewRoleForm>(DEFAULT_NEW_ROLE);
  const [creatingRole, setCreatingRole] = useState(false);
  const [toast, setToast]               = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const showSuccessToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 1000);
  };

  // Tab 3 — gán quyền trực tiếp cho user
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [searchStaffPerms, setSearchStaffPerms] = useState('');

  useEffect(() => { fetchData(); }, []);

  // ─── Helpers ────────────────────────────────────────────────

  // Tạo mảng permissions đầy đủ 8 module, merge với data thực từ DB
  const buildFullPermissions = (existing: any[], idField: 'role_id' | 'user_id', idValue: number): Permission[] =>
    modules.map(mod => {
      const found = existing.find(p => p.module === mod.id);
      return found
        ? { ...found }
        : { [idField]: idValue, module: mod.id, can_read: false, can_add: false, can_edit: false, can_delete: false };
    });

  // Tính allowed_modules từ danh sách permissions (những module can_read=true)
  const permsToAllowedModules = (perms: Permission[]): string[] =>
    perms.filter(p => p.can_read).map(p => p.module);

  // ─── Fetch ──────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Roles
      const { data: rolesData } = await supabase
        .from(TABLE('erp_roles'))
        .select('*')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID])
        .order('level', { ascending: true });

      // 2. Staff + profile (để lấy erp_role_id + is_super_admin)
      const { data: staffData } = await supabase
        .from(TABLE('users'))
        .select('id, full_name, esc_staff_profiles(erp_role_id, is_super_admin)')
        .eq('user_type', 'staff')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      // 3. Tất cả user_id đang có quyền riêng lẻ (để đánh badge)
      const { data: directPermsData } = await supabase
        .from(TABLE('user_permissions'))
        .select('user_id')
        .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

      const usersWithDirectPerms = new Set((directPermsData || []).map((r: any) => r.user_id));

      setRoles(rolesData || []);
      if (rolesData && rolesData.length > 0) {
        // Tải toàn bộ cấu hình phân quyền vai trò cùng lúc
        const { data: allRolePerms } = await supabase
          .from(TABLE('erp_role_permissions'))
          .select('*');

        const combinedPerms: Permission[] = [];
        rolesData.forEach(r => {
          const roleExisting = (allRolePerms || []).filter((p: any) => p.role_id === r.id);
          const roleFull = buildFullPermissions(roleExisting, 'role_id', r.id);
          combinedPerms.push(...roleFull);
        });
        setPermissions(combinedPerms);
      }

      const formattedStaff: StaffMember[] = (staffData || [])
        .map((s: any) => {
          const profile = Array.isArray(s.esc_staff_profiles) ? s.esc_staff_profiles[0] : s.esc_staff_profiles;
          return {
            id: s.id,
            full_name: s.full_name,
            erp_role_id: profile?.erp_role_id || null,
            has_direct_perms: usersWithDirectPerms.has(s.id),
            is_super_admin: profile?.is_super_admin === true,
          };
        })
        .filter(s => !s.is_super_admin);

      setStaff(formattedStaff);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: number) => {
    const { data } = await supabase
      .from(TABLE('user_permissions'))
      .select('*')
      .eq('user_id', userId);
    setUserPermissions(buildFullPermissions(data || [], 'user_id', userId));
  };

  // ─── Toggle handlers ─────────────────────────────────────────

  const handleTogglePerm = (roleId: number, moduleId: string, field: keyof Permission) => {
    setPermissions(prev => {
      const target = prev.find(p => p.role_id === roleId && p.module === moduleId);
      if (!target) return prev;

      const nextValue = !target[field as keyof Permission];

      // Tìm tất cả các menu con thuộc menu cha vừa click
      const childModules = modules.filter(m => 'parentId' in m && m.parentId === moduleId);
      const childIds = childModules.map(c => c.id);

      return prev.map(p => {
        if (p.role_id === roleId) {
          if (p.module === moduleId) {
            return { ...p, [field]: nextValue };
          }
          if (childIds.includes(p.module)) {
            return { ...p, [field]: nextValue };
          }
        }
        return p;
      });
    });
  };

  const handleToggleUserPerm = (moduleId: string, field: keyof Permission) => {
    setUserPermissions(prev => {
      const target = prev.find(p => p.module === moduleId);
      if (!target) return prev;

      const nextValue = !target[field as keyof Permission];

      // Tìm tất cả các menu con thuộc menu cha vừa click
      const childModules = modules.filter(m => 'parentId' in m && m.parentId === moduleId);
      const childIds = childModules.map(c => c.id);

      return prev.map(p => {
        if (p.module === moduleId) {
          return { ...p, [field]: nextValue };
        }
        if (childIds.includes(p.module)) {
          return { ...p, [field]: nextValue };
        }
        return p;
      });
    });
  };

  // ─── Save TAB 1: Quyền của Role ─────────────────────────────

  const saveRolePermissions = async () => {
    setSaving(true);
    try {
      // Batch upsert thay vì vòng lặp N queries
      const toUpsert = permissions.map(p => ({
        role_id:    p.role_id,
        module:     p.module,
        can_read:   p.can_read,
        can_add:    p.can_add,
        can_edit:   p.can_edit,
        can_delete: p.can_delete,
        website_id: [APP_CONFIG.WEBSITE_ID],
      }));

      const { error } = await supabase
        .from(TABLE('erp_role_permissions'))
        .upsert(toUpsert, { onConflict: 'role_id,module' });

      if (error) throw error;

      // Đồng bộ allowed_modules cho tất cả staff đang dùng các role tương ứng
      for (const r of roles) {
        const rolePerms = permissions.filter(p => p.role_id === r.id);
        const newAllowedModules = permsToAllowedModules(rolePerms);
        const affectedUserIds = staff
          .filter(s => s.erp_role_id === r.id && !s.has_direct_perms)
          .map(s => s.id);

        if (affectedUserIds.length > 0) {
          await supabase
            .from(TABLE('staff_profiles'))
            .update({ allowed_modules: newAllowedModules })
            .in('user_id', affectedUserIds);
        }
      }

      showSuccessToast('Đã lưu phân quyền vai trò thành công!');
    } catch (err) {
      console.error('Error saving role permissions:', err);
      alert('Đã xảy ra lỗi khi lưu phân quyền vai trò.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Save TAB 2: Gán Role cho User ──────────────────────────

  const assignRole = async (userId: number, roleId: number | null) => {
    try {
      // 1. Cập nhật erp_role_id trong staff_profiles
      await supabase
        .from(TABLE('staff_profiles'))
        .update({ erp_role_id: roleId })
        .eq('user_id', userId);

      // 2. Nếu gán role mới → xóa toàn bộ quyền riêng để role có hiệu lực
      if (roleId !== null) {
        await supabase
          .from(TABLE('user_permissions'))
          .delete()
          .eq('user_id', userId);

        // Cập nhật allowed_modules theo role mới
        const { data: rolePermsData } = await supabase
          .from(TABLE('erp_role_permissions'))
          .select('module, can_read')
          .eq('role_id', roleId);

        const newModules = (rolePermsData || [])
          .filter((p: any) => p.can_read)
          .map((p: any) => p.module);

        await supabase
          .from(TABLE('staff_profiles'))
          .update({ allowed_modules: newModules })
          .eq('user_id', userId);
      }

      // 3. Cập nhật local state
      setStaff(prev => prev.map(s =>
        s.id === userId
          ? { ...s, erp_role_id: roleId, has_direct_perms: false }
          : s
      ));

      // Nếu đang xem user permissions của user này → reset
      if (selectedStaffId === userId) {
        setUserPermissions(buildFullPermissions([], 'user_id', userId));
      }

      showSuccessToast('Đã gán vai trò thành công!');
    } catch (err) {
      console.error('Error assigning role:', err);
      alert('Gán vai trò thất bại.');
    }
  };

  // ─── Save TAB 3: Quyền riêng cho User ───────────────────────

  const saveUserPermissions = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    try {
      // 1. Xóa sạch quyền riêng cũ rồi insert mới (delete+insert đảm bảo clean)
      await supabase
        .from(TABLE('user_permissions'))
        .delete()
        .eq('user_id', selectedStaffId);

      const toInsert = userPermissions.map(p => ({
        user_id:    selectedStaffId,
        module:     p.module,
        can_read:   p.can_read,
        can_add:    p.can_add,
        can_edit:   p.can_edit,
        can_delete: p.can_delete,
        website_id: [APP_CONFIG.WEBSITE_ID],
      }));

      const { error } = await supabase
        .from(TABLE('user_permissions'))
        .insert(toInsert);

      if (error) throw error;

      // 2. Gỡ role → erp_role_id = null (quyền riêng override hoàn toàn)
      await supabase
        .from(TABLE('staff_profiles'))
        .update({ erp_role_id: null })
        .eq('user_id', selectedStaffId);

      // 3. Cập nhật allowed_modules trong staff_profiles theo quyền riêng mới
      const newAllowedModules = permsToAllowedModules(userPermissions);
      await supabase
        .from(TABLE('staff_profiles'))
        .update({ allowed_modules: newAllowedModules })
        .eq('user_id', selectedStaffId);

      // 4. Cập nhật local state
      setStaff(prev => prev.map(s =>
        s.id === selectedStaffId
          ? { ...s, erp_role_id: null, has_direct_perms: true }
          : s
      ));

      const selectedName = staff.find(s => s.id === selectedStaffId)?.full_name || '';
      showSuccessToast(`Đã gán QUYỀN RIÊNG cho ${selectedName} thành công!`);
      fetchUserPermissions(selectedStaffId);
    } catch (err) {
      console.error('Error saving user permissions:', err);
      alert('Đã xảy ra lỗi khi lưu quyền riêng.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Tạo Role mới ───────────────────────────────────────────

  const handleCreateRole = async () => {
    if (!newRole.name.trim() || !newRole.label.trim()) return;
    setCreatingRole(true);
    try {
      const nextLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level)) + 1 : 1;
      const { data, error } = await supabase
        .from(TABLE('erp_roles'))
        .insert({
          name:        newRole.name.trim().toLowerCase().replace(/\s+/g, '_'),
          label:       newRole.label.trim(),
          description: newRole.description.trim() || null,
          color:       newRole.color,
          level:       nextLevel,
          website_id:  [APP_CONFIG.WEBSITE_ID],
        })
        .select()
        .single();

      if (error) throw error;

      // Tạo permissions mặc định toàn false cho role mới (batch insert)
      await supabase.from(TABLE('erp_role_permissions')).insert(
        modules.map(m => ({
          role_id:    data.id,
          module:     m.id,
          can_read:   false,
          can_add:    false,
          can_edit:   false,
          can_delete: false,
          website_id: [APP_CONFIG.WEBSITE_ID],
        }))
      );

      setShowNewRoleModal(false);
      setNewRole(DEFAULT_NEW_ROLE);
      await fetchData();
    } catch (err) {
      console.error('Error creating role:', err);
      alert('Tạo role thất bại. Kiểm tra console.');
    } finally {
      setCreatingRole(false);
    }
  };

  // ─── Helpers UI ─────────────────────────────────────────────

  const handleSelectStaffForPerms = (staffId: number) => {
    setSelectedStaffId(staffId);
    fetchUserPermissions(staffId);
  };

  const filteredStaff = staff.filter(s =>
    s.full_name.toLowerCase().includes(searchStaff.toLowerCase())
  );

  const filteredStaffPerms = staff.filter(s =>
    s.full_name.toLowerCase().includes(searchStaffPerms.toLowerCase())
  );

  const selectedStaffInfo = staff.find(s => s.id === selectedStaffId) || null;

  if (loading) return (
    <div className="p-8 text-center italic text-slate-500">Đang tải cấu hình phân quyền...</div>
  );

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 relative">
      {/* Toast thông báo thành công ở giữa màn hình (trong 1s) */}
      {toast.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/95 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border border-slate-700/50 transform animate-in fade-in zoom-in-95 duration-150 ease-out font-bold text-sm text-center max-w-sm">
            <span className="material-icons-round text-emerald-400 text-xl animate-bounce">check_circle</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cấu hình Hệ thống & Phân quyền</h1>
          <p className="text-xs text-slate-400 mt-0.5">3 lớp phân quyền: Cài Role → Gán Role cho User → Gán Quyền riêng cho User</p>
        </div>
        <button
          onClick={() => setShowNewRoleModal(true)}
          className="bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:-translate-y-0.5"
        >
          <span className="material-icons-round text-xs">add_moderator</span> Tạo vai trò mới
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[550px] flex flex-col">
        {/* Tab Header */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center gap-6 bg-slate-50/20">
          {([
            { key: 'permissions',      icon: 'tune',                 label: '1- Cài ROLE' },
            { key: 'user_roles',       icon: 'supervisor_account',   label: '2- Gán ROLE cho USER' },
            { key: 'user_permissions', icon: 'admin_panel_settings', label: '3- Gán QUYỀN cho USER' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-sm font-bold pb-4 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="material-icons-round text-sm">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6">

          {/* ─── TAB 1: Cài ROLE (Ma trận Phân quyền) ──────────────────────────────── */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Ma trận Phân quyền vai trò (ROLE)</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Bật/tắt trực tiếp các quyền Xem, Thêm, Sửa, Xóa cho từng vai trò trên từng phân hệ.</p>
                </div>
                <button
                  onClick={saveRolePermissions}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="material-icons-round text-lg">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình phân quyền'}
                </button>
              </div>

              {/* Bảng Ma trận Phân quyền vai trò */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-2.5 w-[200px] border-r border-slate-200 text-xs">PHÂN HỆ (MODULE)</th>
                      {roles.map(role => (
                        <th key={role.id} className="px-2 py-2.5 text-center border-r border-slate-200 last:border-r-0 min-w-[110px]">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="inline-block w-2 h-2 rounded-full border border-white shadow-sm"
                              style={{ backgroundColor: role.color }}
                            />
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">{role.label}</span>
                            <span className="text-[8px] text-slate-400 font-bold tracking-widest uppercase leading-tight">{role.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modules.map(mod => {
                      const isSub = 'isSub' in mod && mod.isSub;
                      return (
                        <tr key={mod.id} className={`${isSub ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/10 transition-colors`}>
                          <td className={`px-4 py-1.5 border-r border-slate-200 ${
                            isSub 
                              ? 'pl-8 font-semibold text-slate-500 text-[11px]' 
                              : 'font-black text-slate-800 text-xs bg-slate-100/30 uppercase tracking-tight'
                          }`}>
                            {isSub && <span className="text-slate-300 mr-1.5 font-bold">↳</span>}
                            {mod.label}
                          </td>
                          {roles.map(role => {
                            const perm = permissions.find(p => p.role_id === role.id && p.module === mod.id) || {
                              role_id: role.id,
                              module: mod.id,
                              can_read: false,
                              can_add: false,
                              can_edit: false,
                              can_delete: false,
                            };

                            return (
                              <td key={role.id} className="px-2 py-1.5 text-center border-r border-slate-100 last:border-r-0">
                                <div className="flex items-center justify-center gap-0.5 bg-slate-50/60 p-0.5 rounded-lg border border-slate-100/80 w-fit mx-auto shadow-inner">
                                  {/* Xem */}
                                  <button
                                    type="button"
                                    title={`Xem - ${role.label}`}
                                    onClick={() => handleTogglePerm(role.id, mod.id, 'can_read')}
                                    className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                                      isPermissionHighlighted(perm, permissions, mod.id, 'can_read')
                                        ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20 scale-105'
                                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="material-icons-round text-[13px]">visibility</span>
                                  </button>

                                  {/* Thêm */}
                                  <button
                                    type="button"
                                    title={`Thêm - ${role.label}`}
                                    onClick={() => handleTogglePerm(role.id, mod.id, 'can_add')}
                                    className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                                      isPermissionHighlighted(perm, permissions, mod.id, 'can_add')
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 scale-105'
                                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="material-icons-round text-[13px]">add</span>
                                  </button>

                                  {/* Sửa */}
                                  <button
                                    type="button"
                                    title={`Sửa - ${role.label}`}
                                    onClick={() => handleTogglePerm(role.id, mod.id, 'can_edit')}
                                    className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                                      isPermissionHighlighted(perm, permissions, mod.id, 'can_edit')
                                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20 scale-105'
                                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="material-icons-round text-[13px]">edit</span>
                                  </button>

                                  {/* Xóa */}
                                  <button
                                    type="button"
                                    title={`Xóa - ${role.label}`}
                                    onClick={() => handleTogglePerm(role.id, mod.id, 'can_delete')}
                                    className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                                      isPermissionHighlighted(perm, permissions, mod.id, 'can_delete')
                                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20 scale-105'
                                        : 'text-slate-300 hover:text-rose-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="material-icons-round text-[13px]">delete</span>
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── TAB 2: Gán ROLE cho USER ─────────────────────── */}
          {activeTab === 'user_roles' && (
            <div className="space-y-4">
              <div className="bg-blue-50/40 border border-blue-100 p-3 rounded-xl flex items-start gap-3 mb-2">
                <span className="material-icons-round text-blue-400 text-sm mt-0.5">info</span>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Gán Role cho User sẽ <strong>xóa toàn bộ quyền riêng lẻ</strong> (nếu có) của user đó.
                  User sau đó sẽ hoàn toàn tuân theo ma trận quyền của Role được gán.
                </p>
              </div>

              <div className="relative max-w-md">
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
                      <th className="px-6 py-4">Trạng thái phân quyền</th>
                      <th className="px-6 py-4 text-right">Gán vai trò</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                          Không tìm thấy nhân viên nào
                        </td>
                      </tr>
                    ) : filteredStaff.map(person => {
                      const assignedRole = roles.find(r => r.id === person.erp_role_id);
                      return (
                        <tr key={person.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center">
                                {assignedRole ? (
                                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: assignedRole.color }} />
                                ) : (
                                  <span className="material-icons-round text-slate-400 text-lg">person</span>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{person.full_name}</h4>
                                <p className="text-[11px] text-slate-400">ID: #{person.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {person.has_direct_perms ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-pink-50 text-pink-600 border-pink-100">
                                <span className="material-icons-round text-[12px]">admin_panel_settings</span>
                                Quyền riêng (override Role)
                              </span>
                            ) : assignedRole ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                                style={{ backgroundColor: `${assignedRole.color}15`, color: assignedRole.color, borderColor: `${assignedRole.color}30` }}
                              >
                                <span className="material-icons-round text-[12px]">badge</span>
                                {assignedRole.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-50 text-slate-400 border-slate-200">
                                Chưa gán
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <select
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer transition-all text-slate-700 min-w-[190px]"
                              value={person.erp_role_id || ''}
                              onChange={e => assignRole(person.id, e.target.value ? parseInt(e.target.value) : null)}
                            >
                              <option value="">-- Gỡ Role (giữ quyền riêng) --</option>
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
            </div>
          )}

          {/* ─── TAB 3: Gán QUYỀN riêng cho USER ─────────────── */}
          {activeTab === 'user_permissions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                  <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Chọn Nhân viên:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-xs">
                      <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                      <input
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder-slate-400"
                        placeholder="Tìm nhân viên..."
                        value={searchStaffPerms}
                        onChange={e => setSearchStaffPerms(e.target.value)}
                      />
                    </div>
                    <select
                      value={selectedStaffId || ''}
                      onChange={e => {
                        const id = Number(e.target.value);
                        if (id) handleSelectStaffForPerms(id);
                        else { setSelectedStaffId(null); setUserPermissions([]); }
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[240px] cursor-pointer shadow-sm"
                    >
                      <option value="">-- Chọn nhân sự --</option>
                      {filteredStaffPerms.map(s => {
                        const r = roles.find(r => r.id === s.erp_role_id);
                        const tag = s.has_direct_perms ? '[Quyền riêng]' : r ? `[${r.label}]` : '[Chưa gán]';
                        return <option key={s.id} value={s.id}>{s.full_name} {tag}</option>;
                      })}
                    </select>
                  </div>
                </div>
                {selectedStaffId && (
                  <button
                    onClick={saveUserPermissions}
                    disabled={saving}
                    className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="material-icons-round text-lg">{saving ? 'sync' : 'save'}</span>
                    {saving ? 'Đang lưu...' : 'Lưu quyền riêng'}
                  </button>
                )}
              </div>

              {selectedStaffId && selectedStaffInfo ? (
                <div className="space-y-4">
                  <div className="bg-pink-50 border border-pink-100 p-4 rounded-xl flex items-start gap-3">
                    <span className="material-icons-round text-pink-500 mt-0.5">warning_amber</span>
                    <div>
                      <p className="text-xs font-bold text-pink-700 uppercase tracking-wider">
                        Gán quyền riêng: {selectedStaffInfo.full_name}
                      </p>
                      <p className="text-xs text-pink-600 mt-1 leading-relaxed">
                        Cấu hình này <strong>override toàn bộ Role</strong> của nhân viên này.
                        Khi lưu, Role cũ sẽ bị gỡ và quyền riêng này có hiệu lực ngay lập tức.
                        {selectedStaffInfo.erp_role_id && (
                          <span className="block mt-0.5">
                            Hiện đang dùng Role: <strong>{roles.find(r => r.id === selectedStaffInfo.erp_role_id)?.label}</strong> — sẽ bị gỡ.
                          </span>
                        )}
                        {selectedStaffInfo.has_direct_perms && (
                          <span className="block mt-0.5 text-emerald-700">
                            Nhân viên này đang có quyền riêng. Bạn đang chỉnh sửa quyền hiện tại.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <PermissionTable
                    permissions={userPermissions}
                    onToggle={handleToggleUserPerm}
                    checkColor="pink"
                  />
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                  <span className="material-icons-round text-3xl text-slate-300 mb-2 block animate-pulse">admin_panel_settings</span>
                  <p className="text-sm font-bold">Vui lòng chọn nhân viên để bắt đầu thiết lập quyền trực tiếp</p>
                  <p className="text-xs text-slate-400 mt-1">Quyền riêng sẽ override và thay thế hoàn toàn Role của nhân viên đó.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal tạo Role mới */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Tạo Vai trò mới</h2>
              <p className="text-xs text-slate-500 mt-1">Cấu hình chi tiết quyền hạn của vai trò sau khi tạo xong.</p>
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
                <p className="text-[10px] text-slate-400 mt-1">Viết thường, không dấu, dùng dấu gạch dưới.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Mô tả</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  rows={2}
                  placeholder="Mô tả ngắn về trách nhiệm..."
                  value={newRole.description}
                  onChange={e => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Màu nhận diện</label>
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
              >Hủy</button>
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

// ─── Sub-component: Bảng quyền dùng chung cho Tab 1 và Tab 3 ─────

interface PermissionTableProps {
  permissions: Permission[];
  onToggle: (module: string, field: keyof Permission) => void;
  checkColor: 'primary' | 'pink';
}

const PermissionTable: React.FC<PermissionTableProps> = ({ permissions, onToggle }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-w-2xl">
      <table className="w-full text-left border-collapse table-auto">
        <thead>
          <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <th className="px-6 py-2.5 border-r border-slate-200 text-xs w-[60%]">PHÂN HỆ (MODULE)</th>
            <th className="px-4 py-2.5 text-center text-xs w-[40%]">QUYỀN HẠN (XEM | THÊM | SỬA | XÓA)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {permissions.map(p => {
            const mod = modules.find(m => m.id === p.module);
            if (!mod) return null;
            const isSub = 'isSub' in mod && mod.isSub;
            return (
              <tr key={p.module} className={`${isSub ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/10 transition-colors`}>
                <td className={`px-6 py-1.5 border-r border-slate-200 ${
                  isSub 
                    ? 'pl-12 font-semibold text-slate-500 text-[11px]' 
                    : 'font-black text-slate-800 text-xs bg-slate-100/30 uppercase tracking-tight'
                }`}>
                  {isSub && <span className="text-slate-300 mr-1.5 font-bold">↳</span>}
                  {mod.label}
                </td>
                <td className="px-4 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1 bg-slate-50/60 p-0.5 rounded-lg border border-slate-100/80 w-fit mx-auto shadow-inner">
                    {/* Xem */}
                    <button
                      type="button"
                      title="Xem"
                      onClick={() => onToggle(p.module, 'can_read')}
                      className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                        isPermissionHighlighted(p, permissions, p.module, 'can_read')
                          ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20 scale-105'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-icons-round text-[13px]">visibility</span>
                    </button>

                    {/* Thêm */}
                    <button
                      type="button"
                      title="Thêm"
                      onClick={() => onToggle(p.module, 'can_add')}
                      className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                        isPermissionHighlighted(p, permissions, p.module, 'can_add')
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 scale-105'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-icons-round text-[13px]">add</span>
                    </button>

                    {/* Sửa */}
                    <button
                      type="button"
                      title="Sửa"
                      onClick={() => onToggle(p.module, 'can_edit')}
                      className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                        isPermissionHighlighted(p, permissions, p.module, 'can_edit')
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20 scale-105'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-icons-round text-[13px]">edit</span>
                    </button>

                    {/* Xóa */}
                    <button
                      type="button"
                      title="Xóa"
                      onClick={() => onToggle(p.module, 'can_delete')}
                      className={`w-6 h-6 rounded-md transition-all flex items-center justify-center ${
                        isPermissionHighlighted(p, permissions, p.module, 'can_delete')
                          ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20 scale-105'
                          : 'text-slate-300 hover:text-rose-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-icons-round text-[13px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RoleManagement;
