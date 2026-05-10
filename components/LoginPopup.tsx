import React, { useState } from 'react';
import { supabase, TABLE } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

interface LoginPopupProps {
  onLoginSuccess: (userData: any) => void;
}

const LoginPopup: React.FC<LoginPopupProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Login qua RPC (bypass RLS, kiểm tra phone + pass trong DB)
      const { data: users, error: loginError } = await supabase
        .rpc('login', { p_phone: phone, p_pass: password });

      if (loginError) throw new Error('Đã xảy ra lỗi khi đăng nhập');

      if (!users || users.length === 0) {
        throw new Error('Số điện thoại hoặc mật khẩu không đúng');
      }

      const user = users[0];

      // Step 2: Verify Website Access
      const allowedWebsites = Array.isArray(user.website_id) ? user.website_id : [];
      if (!allowedWebsites.includes(APP_CONFIG.WEBSITE_ID)) {
        throw new Error(`Tài khoản không có quyền truy cập vào ${APP_CONFIG.WEBSITE_NAME}`);
      }

      // Step 3: Set RLS session
      await supabase.rpc('set_app_user', { uid: user.id });

      // Step 4: Fetch staff profile
      const { data: staffProfile, error: profileError } = await supabase
        .from(TABLE('staff_profiles'))
        .select('id, user_id, erp_role_id, is_super_admin, allowed_modules, website_id')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching staff profile:', profileError);
      }

      // Fetch role info riêng để tránh RLS block foreign key join
      let erp_role: { name: string; label: string; color: string } | null = null;
      if (staffProfile?.erp_role_id) {
        const { data: roleData } = await supabase
          .from(TABLE('erp_roles'))
          .select('name, label, color')
          .eq('id', staffProfile.erp_role_id)
          .single();
        erp_role = roleData;
      }

      // Step 5: Xác định nguồn quyền theo thứ tự ưu tiên:
      //   Ưu tiên 1 — Super Admin: toàn quyền tuyệt đối
      //   Ưu tiên 2 — Quyền riêng (esc_user_permissions): override Role hoàn toàn
      //   Ưu tiên 3 — Role (esc_erp_role_permissions): quyền theo nhóm
      //   Fallback   — allowed_modules trong staff_profiles (cache)

      let allowedModules: string[] = [];
      let roleLabel: string | null = null;
      let roleName:  string | null = null;
      let roleColor: string | null = null;
      let permSource: 'super_admin' | 'direct' | 'role' | 'cache' = 'cache';

      if (user.is_super_admin === true) {
        // Super Admin: toàn quyền, không cần query thêm
        allowedModules = ['inbound','orders','outbound','inventory','reports','operation','hr','finance','settings'];
        roleLabel = 'Super Admin';
        roleName  = 'super_admin';
        roleColor = '#ef4444';
        permSource = 'super_admin';

      } else {
        // Fetch quyền riêng trước (ưu tiên cao nhất)
        const { data: directPerms } = await supabase
          .from(TABLE('user_permissions'))
          .select('module, can_read, can_add, can_edit, can_delete')
          .eq('user_id', user.id)
          .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

        if (directPerms && directPerms.length > 0) {
          // Ưu tiên 2: Quyền riêng — chỉ lấy module có can_read=true
          allowedModules = directPerms
            .filter((p: any) => p.can_read === true)
            .map((p: any) => p.module);
          roleLabel  = 'Quyền trực tiếp';
          roleName   = 'custom_permissions';
          roleColor  = '#ec4899';
          permSource = 'direct';

        } else if (staffProfile?.erp_role_id) {
          // Ưu tiên 3: Role — đọc từ esc_erp_role_permissions
          const { data: rolePerms } = await supabase
            .from(TABLE('erp_role_permissions'))
            .select('module, can_read')
            .eq('role_id', staffProfile.erp_role_id);

          allowedModules = (rolePerms || [])
            .filter((p: any) => p.can_read === true)
            .map((p: any) => p.module);
          roleLabel  = erp_role?.label || null;
          roleName   = erp_role?.name  || null;
          roleColor  = erp_role?.color || null;
          permSource = 'role';

        } else {
          // Fallback: đọc cache allowed_modules trong staff_profiles
          allowedModules = staffProfile?.allowed_modules || [];
          roleLabel  = erp_role?.label || null;
          roleName   = erp_role?.name  || null;
          roleColor  = erp_role?.color || null;
          permSource = 'cache';
        }
      }

      console.log(`[Login] Perm source: ${permSource} | Modules: ${allowedModules.join(', ')|| '(none)'}`);

      const userData = {
        ...user,
        staffProfile: staffProfile || null,
        isSuperAdmin: user.is_super_admin === true,
        allowedModules: allowedModules,
        roleLabel: roleLabel,
        roleName: roleName,
        roleColor: roleColor,
      };

      localStorage.setItem('wms_user', JSON.stringify(userData));
      onLoginSuccess(userData);
      
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-blue-900/20 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
               <img src="/ESC__logo-01.jpg" alt="Logo" className="w-16 h-16 object-cover rounded-xl" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Đăng nhập Hệ thống</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Kho ESC WMS</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Số điện thoại</label>
              <div className="relative">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">phone</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 font-medium transition-all outline-none"
                  placeholder="Nhập số điện thoại..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Mật khẩu</label>
              <div className="relative">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 font-medium transition-all outline-none"
                  placeholder="Nhập mật khẩu..."
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-rose-600 text-sm font-bold animate-shake">
                <span className="material-icons-round text-lg">error_outline</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-blue-700 disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Đăng nhập hệ thống <span className="material-icons-round">login</span></>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">© 2024 Kho ESC WMS</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPopup;
