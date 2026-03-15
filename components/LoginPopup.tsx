import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

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
      // Step 1: Query users table for the phone number
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (userError || !user) {
        throw new Error('Số điện thoại không tồn tại');
      }

      // Step 2: Check password (In production, use hashed passwords)
      if (user.pass !== password) {
        throw new Error('Mật khẩu không chính xác');
      }

      // Step 2.5: Verify Website Access (Multi-tenancy)
      const { APP_CONFIG } = await import('../appConfig');
      const allowedWebsites = Array.isArray(user.website_id) ? user.website_id : [];
      
      // If website_id mảng is empty, assume they have no access or we want to allow login?
      // User requested to check if current website_id is in the array.
      if (!allowedWebsites.includes(APP_CONFIG.WEBSITE_ID)) {
        throw new Error(`Tài khoản không có quyền truy cập vào ${APP_CONFIG.WEBSITE_NAME}`);
      }

      // Step 3: Fetch staff profile for permissions
      const { data: staffProfile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows found"
         console.error('Error fetching staff profile:', profileError);
      }

      const userData = {
        ...user,
        staffProfile: staffProfile || null,
        isSuperAdmin: staffProfile?.is_super_admin || false,
        allowedModules: staffProfile?.allowed_module || []
      };

      // Store in localStorage for persistence
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
               <img src="/logo-kho-hang-sg.jpg" alt="Logo" className="w-16 h-16 object-cover rounded-xl" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Đăng nhập Hệ thống</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Kho Hàng Sài Gòn WMS</p>
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
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">© 2024 Kho Hàng Sài Gòn WMS</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPopup;
