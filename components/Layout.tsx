import React, { useState } from 'react';
import { PageType, NavItem } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: PageType;
  setActivePage: (page: PageType) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'inventory', label: 'Kho hàng', icon: 'inventory_2' },
  { id: 'costs', label: 'Tài chính', icon: 'payments' },
  { id: 'rackMap', label: 'Sơ đồ kệ', icon: 'map' },
  { id: 'putAway', label: 'Gợi ý nhập kho', icon: 'auto_awesome' },
  { id: 'orders', label: 'Đơn hàng', icon: 'shopping_cart' },
  { id: 'taskProgress', label: 'Vận chuyển', icon: 'local_shipping' },
  { id: 'staffAdmin', label: 'Nhân sự', icon: 'groups' },
  { id: 'staffCheckIn', label: 'Chấm công', icon: 'fingerprint' },
  { id: 'scanner', label: 'Quét mã vạch', icon: 'qr_code_scanner' },
];

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
              <span className="material-icons-round">warehouse</span>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-none">KHO SÀI GÒN</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">WMS System</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
          >
            <span className="material-icons-round">close</span>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 custom-scrollbar overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handlePageChange(item.id)}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all duration-200 group ${
                activePage === item.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`material-icons-round text-xl ${activePage === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
          
          <div className="pt-8 pb-2 px-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Hệ thống</div>
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <span className="material-icons-round text-xl">settings</span>
            <span className="font-medium text-sm">Cài đặt</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600 overflow-hidden shrink-0">
               <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVzLvkJIdAaJAEd2-mZQ2Exovadg1pYx3BKGoMeVNkIUaI4hRmWdFDXX9VUlqPMwE9r-Xm4zpP9cAqP-wfts5jJOB5LPtA6l7d0W__i7xCJ2fJ40GhBnkiMg6LzBuBtruLnrV8xzyldIKZzpgkpjIAqP6PwlRyrMHKrbXKsXIb_31U66S9kGs-uHj6c8EEBXrNnnmkhICniJKNVAPl9oZIQqiNkera16ObwENxA1DXo1B1Gh1hPg3CwVUol05bFhuBjNmiBTjLK5WA" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-sm font-bold truncate text-white">Nguyễn Văn A</p>
              <p className="text-xs text-slate-400 truncate">Quản lý kho</p>
            </div>
          </div>
        </div>
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
             <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="material-icons-round text-sm text-slate-500">calendar_today</span>
                <span className="text-xs font-bold text-slate-700">14/10/2023</span>
             </div>
            <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative">
              <span className="material-icons-round">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500 font-medium">Trạng thái hệ thống</p>
              <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ổn định
              </p>
            </div>
            {/* Mobile User Icon - Only visible on very small screens if needed, otherwise hidden */}
             <div className="sm:hidden w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
               <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVzLvkJIdAaJAEd2-mZQ2Exovadg1pYx3BKGoMeVNkIUaI4hRmWdFDXX9VUlqPMwE9r-Xm4zpP9cAqP-wfts5jJOB5LPtA6l7d0W__i7xCJ2fJ40GhBnkiMg6LzBuBtruLnrV8xzyldIKZzpgkpjIAqP6PwlRyrMHKrbXKsXIb_31U66S9kGs-uHj6c8EEBXrNnnmkhICniJKNVAPl9oZIQqiNkera16ObwENxA1DXo1B1Gh1hPg3CwVUol05bFhuBjNmiBTjLK5WA" className="w-full h-full object-cover" />
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