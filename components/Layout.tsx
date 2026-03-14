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
    id: 'wh_manage', label: 'Kho hàng', icon: 'storefront',
    children: [
      { id: 'inventory', label: 'Quản lý kho', icon: 'inventory' },
      { id: 'rackMap', label: 'Sơ đồ kệ', icon: 'location_on' },
      { id: 'putAway', label: 'Nhập kho', icon: 'login' },
    ]
  },
  { 
    id: 'orders_manage', label: 'Vận hành', icon: 'shopping_cart',
    children: [
      { id: 'orders', label: 'Đơn hàng', icon: 'receipt_long' },
      { id: 'taskProgress', label: 'Vận chuyển', icon: 'local_shipping' },
    ]
  },
  { 
    id: 'finance_manage', label: 'Tài chính', icon: 'payments',
    children: [
      { id: 'costs', label: 'Thu chi', icon: 'monetization_on' },
    ]
  },
  { 
    id: 'hr_manage', label: 'Nhân sự', icon: 'people',
    children: [
      { id: 'staffAdmin', label: 'Nhân sự', icon: 'badge' },
      { id: 'staffCheckIn', label: 'Chấm công', icon: 'fingerprint' },
    ]
  },
  { id: 'scanner', label: 'Quét mã', icon: 'qr_code_scanner' },
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
    
    // Manual mapping for demo/simplicity - can be expanded
    const moduleMapping: Record<string, string> = {
      'dashboard': 'dashboard',
      'inventory': 'inventory',
      'costs': 'finance',
      'orders': 'orders',
      'taskProgress': 'shipping',
      'staffAdmin': 'hr',
      'staffCheckIn': 'attendance'
    };
    
    const requiredModule = moduleMapping[item.id];
    if (!requiredModule) return true; // Default visible if not explicitly mapped
    
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
              <span className="font-extrabold text-[17px] tracking-tight text-white block leading-tight">KHO SÀI GÒN</span>
              <span className="text-[10px] text-primary/80 font-bold uppercase tracking-widest">WMS System</span>
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
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 w-full rounded-lg transition-all duration-200 group ${
                    activePage === item.id || (hasChildren && item.children?.some(c => c.id === activePage))
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <span className={`material-icons-round text-[20px] ${
                      activePage === item.id || (hasChildren && item.children?.some(c => c.id === activePage))
                        ? 'text-primary' 
                        : 'text-slate-500 group-hover:text-slate-300'
                    }`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {hasChildren && (
                    <span className={`material-icons-round text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  )}
                </button>

                {hasChildren && (
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[400px] opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-5 pl-4 border-l border-slate-800 space-y-0.5 mt-1">
                      {item.children?.map(child => (
                        <button
                          key={child.id}
                          onClick={() => handlePageChange(child.id as PageType)}
                          className={`flex items-center gap-3 px-3 py-2 w-full rounded-md text-[13px] font-semibold transition-all ${
                            activePage === child.id 
                              ? 'text-white' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <span className={`material-icons-round text-[6px] ${activePage === child.id ? 'text-primary scale-150' : 'text-slate-700'}`}>circle</span>
                          {child.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-4">Hệ thống</div>
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors text-sm font-bold">
            <span className="material-icons-round text-[20px]">settings</span>
            <span>Cài đặt</span>
          </button>
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

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar relative">
          {children}
        </main>
      </div>
    </div>
  );
};