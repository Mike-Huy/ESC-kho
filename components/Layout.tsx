import React, { useState } from 'react';
import { PageType, NavItem } from '../types';

export interface UserData {
  id: number;
  phone: string;
  full_name: string;
  avatar?: string;
  isSuperAdmin: boolean;
  allowedModules: string[];
}

interface LayoutProps {
  children: React.ReactNode;
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  user: UserData | null;
  onLogout: () => void;
}

const navItems: NavItem[] = [
  { 
    id: 'grp_inbound', label: '1. Đơn nhập', icon: 'login',
    children: [
      { id: 'inbound_new', label: 'Hàng mới', icon: 'add_shopping_cart' },
      { id: 'inbound_return', label: 'Hàng trả', icon: 'settings_backup_restore' },
      { id: 'inbound_internal', label: 'Xử lý nội bộ', icon: 'sync_alt' },
    ]
  },
  { 
    id: 'grp_proc', label: '2. Xử lý đơn', icon: 'fact_check',
    children: [
      { id: 'orders', label: 'Danh sách đơn', icon: 'list_alt' },
      { id: 'proc_pick', label: 'Soạn đơn', icon: 'panning_alt' },
      { id: 'proc_pack', label: 'Đóng gói', icon: 'inventory_2' },
      { id: 'proc_route', label: 'Xếp tuyến', icon: 'fork_right' },
    ]
  },
  { 
    id: 'grp_outbound', label: '3. Đơn xuất', icon: 'logout',
    children: [
      { id: 'outbound_pending', label: 'Đơn chờ xuất', icon: 'pending_actions' },
      { id: 'outbound_done', label: 'Đơn đã xuất', icon: 'task_alt' },
      { id: 'outbound_cancel', label: 'Đơn hủy', icon: 'cancel' },
    ]
  },
  { 
    id: 'grp_warehouse', label: '4. Kho hàng', icon: 'warehouse',
    children: [
      { id: 'wh_list', label: 'Danh sách kho', icon: 'list' },
      { id: 'rackMap', label: 'Sơ đồ kho', icon: 'map' },
      { id: 'wh_location', label: 'Vị trí kho', icon: 'location_on' },
    ]
  },
  { 
    id: 'grp_report', label: '5. Báo cáo', icon: 'analytics',
    children: [
      { id: 'rpt_inbound', label: 'Báo cáo nhập', icon: 'summarize' },
      { id: 'rpt_proc', label: 'BC xử lý đơn', icon: 'fact_check' },
      { id: 'rpt_outbound', label: 'BC xuất', icon: 'assignment' },
      { id: 'inventory', label: 'Xuất - Nhập - Tồn', icon: 'account_balance_wallet' },
    ]
  },
  { 
    id: 'grp_operation', label: '6. Vận hành', icon: 'settings_suggest',
    children: [
      { id: 'op_split', label: 'Rã hàng chẵn', icon: 'call_split' },
      { id: 'op_repack', label: 'Đóng gói lại', icon: 'package_2' },
      { id: 'op_audit', label: 'Kiểm kê kho', icon: 'checklist' },
      { id: 'op_replenish', label: 'Châm hàng', icon: 'rebase_edit' },
      { id: 'op_transfer', label: 'Luân chuyển', icon: 'move_down' },
    ]
  },
  { 
    id: 'grp_hr', label: '7. Nhân sự', icon: 'badge',
    children: [
      { id: 'hr_staff_list', label: 'DS nhân viên', icon: 'people' },
      { id: 'hr_salary_level', label: 'Cấp bậc lương', icon: 'grade' },
      { id: 'hr_shifts', label: 'Ca làm việc', icon: 'history_toggle_off' },
      { id: 'staffCheckIn', label: 'Chấm công', icon: 'fingerprint' },
      { id: 'hr_policy', label: 'Chế độ', icon: 'description' },
    ]
  },
  { 
    id: 'grp_finance', label: '8. Tài chính', icon: 'payments',
    children: [
      { id: 'fin_wh', label: 'Chi phí kho', icon: 'business' },
      { id: 'fin_op', label: 'Chi phí vận hành', icon: 'engineering' },
      { id: 'fin_hr', label: 'Chi phí nhân sự', icon: 'person_search' },
      { id: 'fin_supplies', label: 'Vật tư tiêu hao', icon: 'auto_fix_normal' },
      { id: 'fin_maint', label: 'Chi phí bảo trì', icon: 'build' },
    ]
  },
  { 
    id: 'grp_settings', label: '9. Cài đặt', icon: 'settings',
    children: [
      { id: 'staffAdmin', label: 'Nhân viên', icon: 'manage_accounts' },
      { id: 'set_permissions', label: 'Phân quyền', icon: 'security' },
      { id: 'set_salary', label: 'Lương', icon: 'price_check' },
    ]
  }
];

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-expand menu containing active page
  React.useEffect(() => {
    navItems.forEach(item => {
      if (item.children?.some(child => child.id === activePage)) {
        setExpandedMenu(item.id as string);
      }
    });
  }, [activePage]);

  // Filter navigation items based on user permissions
  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    
    // Mapping structure for permissions
    const moduleMapping: Record<string, string> = {
      'grp_inbound': 'inbound',
      'grp_proc': 'orders',
      'grp_outbound': 'outbound',
      'grp_warehouse': 'inventory',
      'grp_report': 'reports',
      'grp_operation': 'operation',
      'grp_hr': 'hr',
      'grp_finance': 'finance',
      'grp_settings': 'hr'
    };
    
    const requiredModule = moduleMapping[item.id as string];
    if (!requiredModule) return true;
    
    return user.allowedModules.includes(requiredModule);
  });

  // Special full-screen layout for mobile check-in
  if (activePage === 'staffCheckIn') {
    return <>{children}</>;
  }

  const handlePageChange = (page: PageType) => {
    setActivePage(page);
    setIsMobileMenuOpen(false); // Close mobile menu after selection
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden glass"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-navy-accent border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-800">
          <button 
            onClick={() => handlePageChange('dashboard')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left w-full group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/10 group-active:scale-95 transition-transform">
              <img src="/logo-kho-hang-sg.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <span className="font-extrabold text-[19px] tracking-tight text-white block leading-tight">KHO SÀI GÒN</span>
              <span className="text-[11px] text-primary/80 font-bold uppercase tracking-widest">WMS System</span>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 custom-scrollbar overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isExpanded = expandedMenu === item.id;
            const hasChildren = !!item.children;
            
            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (hasChildren) {
                      setExpandedMenu(isExpanded ? null : (item.id as string));
                    } else {
                      handlePageChange(item.id as PageType);
                    }
                  }}
                  className={`flex items-center justify-between gap-3 px-3 py-1.5 w-full rounded-lg transition-all duration-200 group ${
                    activePage === item.id || (hasChildren && item.children?.some(c => c.id === activePage))
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 text-[16px] font-bold">
                    <span className={`material-icons-round text-[22px] ${
                      activePage === item.id || (hasChildren && item.children?.some(c => c.id === activePage))
                        ? 'text-primary' 
                        : 'text-slate-500 group-hover:text-slate-300'
                    }`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {hasChildren && (
                    <span className={`material-icons-round text-base transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  )}
                </button>

                {hasChildren && (
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-5 pl-4 border-l border-slate-800 space-y-0.5 mt-1 mb-1">
                      {item.children?.map(child => (
                        <button
                          key={child.id}
                          onClick={() => handlePageChange(child.id as PageType)}
                          className={`flex items-center gap-3 px-3 py-1.5 w-full rounded-md text-[15px] font-semibold transition-all ${
                            activePage === child.id 
                              ? 'bg-primary/20 text-white' 
                              : 'text-slate-500 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span className={`material-icons-round text-[8px] ${activePage === child.id ? 'text-primary scale-125' : 'text-slate-700 group-hover:text-slate-500'}`}>circle</span>
                          {child.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
        </nav>

      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background-light relative w-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white border-b border-border-light z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-4 flex-1">
             {/* Mobile Menu Button - Visible on lg and below */}
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Menu"
            >
                <span className="material-icons-round text-2xl">menu</span>
            </button>

             <div className="relative w-full max-w-md hidden md:block">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700 placeholder-slate-400 transition-all outline-none"
                placeholder="Tìm kiếm đơn hàng, sản phẩm, SKU..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
             <div className="hidden md:flex flex-col items-end gap-0.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 min-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <span className="material-icons-round text-[12px] text-slate-500">calendar_today</span>
                  <span className="text-[11px] font-bold text-slate-700">
                    {currentTime.toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-icons-round text-[12px] text-slate-500">schedule</span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {currentTime.toLocaleTimeString('vi-VN', { hour12: false })}
                  </span>
                </div>
             </div>
            <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative">
              <span className="material-icons-round">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            
            <div className="hidden sm:flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.full_name || 'Người dùng'}</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">
                  {user?.isSuperAdmin ? 'Super Admin' : 'Nhân viên'}
                </p>
              </div>
              
              <div className="relative group">
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-100 cursor-pointer transition-transform active:scale-95">
                  <img 
                    src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDVzLvkJIdAaJAEd2-mZQ2Exovadg1pYx3BKGoMeVNkIUaI4hRmWdFDXX9VUlqPMwE9r-Xm4zpP9cAqP-wfts5jJOB5LPtA6l7d0W__i7xCJ2fJ40GhBnkiMg6LzBuBtruLnrV8xzyldIKZzpgkpjIAqP6PwlRyrMHKrbXKsXIb_31U66S9kGs-uHj6c8EEBXrNnnmkhICniJKNVAPl9oZIQqiNkera16ObwENxA1DXo1B1Gh1hPg3CwVUol05bFhuBjNmiBTjLK5WA"} 
                    alt="User" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                {/* Logout Tooltip/Button Overlay */}
                <button 
                  onClick={onLogout}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors z-30"
                  title="Đăng xuất"
                >
                  <span className="material-icons-round text-[12px]">logout</span>
                </button>
              </div>
            </div>
            {/* Mobile User Icon - Only visible on very small screens if needed, otherwise hidden */}
             <div className="sm:hidden w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
               <img src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDVzLvkJIdAaJAEd2-mZQ2Exovadg1pYx3BKGoMeVNkIUaI4hRmWdFDXX9VUlqPMwE9r-Xm4zpP9cAqP-wfts5jJOB5LPtA6l7d0W__i7xCJ2fJ40GhBnkiMg6LzBuBtruLnrV8xzyldIKZzpgkpjIAqP6PwlRyrMHKrbXKsXIb_31U66S9kGs-uHj6c8EEBXrNnnmkhICniJKNVAPl9oZIQqiNkera16ObwENxA1DXo1B1Gh1hPg3CwVUol05bFhuBjNmiBTjLK5WA"} className="w-full h-full object-cover" />
             </div>
          </div>
        </header>
        
        {/* Floating Action Buttons Area - Right Fixed */}
        <div className="fixed right-6 bottom-10 z-[60] flex flex-col gap-4">
          <button 
            onClick={() => setActivePage('scanner')}
            className="group flex items-center justify-end gap-3 transition-all"
          >
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100">
              Quét mã vạch
            </span>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90 ${activePage === 'scanner' ? 'bg-primary text-white scale-110 shadow-primary/30' : 'bg-white text-slate-600 hover:text-primary'}`}>
              <span className="material-icons-round text-3xl">qr_code_scanner</span>
            </div>
          </button>

          <button 
            onClick={() => setActivePage('staffCheckIn')}
            className="group flex items-center justify-end gap-3 transition-all"
          >
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100">
              Chấm công
            </span>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90 ${activePage === 'staffCheckIn' ? 'bg-primary text-white scale-110 shadow-primary/30' : 'bg-white text-slate-600 hover:text-emerald-500'}`}>
              <span className="material-icons-round text-3xl">fingerprint</span>
            </div>
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar relative">
          {children}
        </main>
      </div>
    </div>
  );
};