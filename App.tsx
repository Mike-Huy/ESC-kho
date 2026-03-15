import React, { useState, useEffect } from 'react';
import { Layout, UserData } from './components/Layout';
import LoginPopup from './components/LoginPopup';
import ComingSoon from './components/ComingSoon';
import { PageType } from './types';
import Dashboard from './pages/Dashboard';
import InventoryReport from './pages/InventoryReport';
import CostAnalysis from './pages/CostAnalysis';
import RackMap from './pages/RackMap';
import PutAway from './pages/PutAway';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import WarehouseLocation from './pages/WarehouseLocation';
import WarehouseMap from './pages/WarehouseMap';
import TaskProgress from './pages/TaskProgress';
import StaffCheckIn from './pages/StaffCheckIn';
import StaffAdmin from './pages/StaffAdmin';
import StaffList from './pages/StaffList';
import StaffProfile from './pages/StaffProfile';
import RoleManagement from './pages/RoleManagement';
import BarcodeScanner from './pages/BarcodeScanner';
import ProductList from './pages/ProductList';
import InboundNew from './pages/InboundNew';
import InboundList from './pages/InboundList';
import InboundReceive from './pages/InboundReceive';
import Picking from './pages/Picking';
import Packing from './pages/Packing';
import Routing from './pages/Routing';
import InboundReturn from './pages/InboundReturn';
import InternalProcess from './pages/InternalProcess';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageType>('dashboard');
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);
  const [selectedPOCode, setSelectedPOCode] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('wms_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsInitialized(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('wms_user');
    setUser(null);
    setActivePage('dashboard');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <InventoryReport />;
      case 'costs': return <CostAnalysis />;
      case 'rackMap': return <RackMap />;
      case 'putAway': return <PutAway />;
      case 'orders': return <OrderList onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} />;
      case 'orderDetail': return <OrderDetail orderCode={selectedOrderCode} onBack={() => setActivePage('orders')} />;
      case 'taskProgress': return <TaskProgress />;
      case 'staffCheckIn': return <StaffCheckIn onExit={() => setActivePage('dashboard')} user={user} />;
      case 'staffAdmin': return <StaffAdmin />;
      case 'scanner': return <BarcodeScanner />;
      
      // Đơn nhập
      case 'inbound_new': return <InboundNew />;
      case 'inbound_list': return <InboundList onReceive={(code) => { setSelectedPOCode(code); setActivePage('inbound_receive'); }} onNew={() => setActivePage('inbound_new')} />;
      case 'inbound_receive': return <InboundReceive poCode={selectedPOCode || ''} onBack={() => setActivePage('inbound_list')} />;
      case 'inbound_return': return <InboundReturn />;
      case 'inbound_internal': return <InternalProcess />;
      
      // Xử lý đơn
      case 'proc_list': return <OrderList onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} />;
      case 'proc_pick': return <Picking />;
      case 'proc_pack': return <Packing />;
      case 'proc_route': return <Routing />;
      
      // Đơn xuất
      case 'outbound_pending': return <ComingSoon title="Đơn chờ xuất" />;
      case 'outbound_done': return <ComingSoon title="Đơn đã xuất" />;
      case 'outbound_cancel': return <ComingSoon title="Đơn hủy" />;
      
      // Kho hàng
      case 'product_list': return <ProductList />;
      case 'wh_list': 
      case 'wh_location': return <WarehouseLocation />;
      case 'wh_map': return <WarehouseMap />;
      case 'wh_stock': return <ComingSoon title="Tồn kho" />;
      
      // Báo cáo
      case 'rpt_inbound': return <ComingSoon title="Báo cáo nhập" />;
      case 'rpt_proc': return <ComingSoon title="BC xử lý đơn" />;
      case 'rpt_outbound': return <ComingSoon title="BC xuất" />;

      
      // Vận hành
      case 'op_split': return <ComingSoon title="Rã hàng chẵn" />;
      case 'op_repack': return <ComingSoon title="Đóng gói lại" />;
      case 'op_audit': return <ComingSoon title="Kiểm kê kho" />;
      case 'op_replenish': return <ComingSoon title="Châm hàng" />;
      case 'op_transfer': return <ComingSoon title="Luân chuyển" />;
      
      // Tài chính
      case 'fin_wh': return <ComingSoon title="Chi phí kho" />;
      case 'fin_op': return <ComingSoon title="Chi phí vận hành" />;
      case 'fin_hr': return <ComingSoon title="Chi phí nhân sự" />;
      case 'fin_supplies': return <ComingSoon title="Vật tư tiêu hao" />;
      case 'fin_maint': return <ComingSoon title="Chi phí bảo trì" />;
      
      // Cài đặt
      case 'set_staff': return <ComingSoon title="Nhân viên" />;
      case 'set_permissions': return <RoleManagement />;
      case 'set_salary': return <ComingSoon title="Lương" />;

      // Nhân sự
      case 'hr_staff_list': return <StaffList onViewStaff={(id) => { setSelectedStaffId(id); setActivePage('hr_staff_profile'); }} />;
      case 'hr_staff_profile': return <StaffProfile staffId={selectedStaffId} onBack={() => setActivePage('hr_staff_list')} />;
      case 'hr_salary_level': return <ComingSoon title="Cấp bậc lương" />;
      case 'hr_shifts': return <ComingSoon title="Ca làm việc" />;
      case 'hr_policy': return <ComingSoon title="Chế độ" />;

      default: return <Dashboard />;
    }
  };

  if (!isInitialized) return null;

  return (
    <>
      {!user && <LoginPopup onLoginSuccess={(userData) => setUser(userData)} />}
      <Layout 
        activePage={activePage} 
        setActivePage={setActivePage} 
        user={user}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
    </>
  );
};

export default App;
