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
import SupplierList from './pages/SupplierList';
import CustomerList from './pages/CustomerList';
import InboundNew from './pages/InboundNew';
import InboundList from './pages/InboundList';
import InboundReceive from './pages/InboundReceive';
import Picking from './pages/Picking';
import Packing from './pages/Packing';
import Routing from './pages/Routing';
import InboundReturn from './pages/InboundReturn';
import InternalProcess from './pages/InternalProcess';
import InboundManager from './pages/InboundManager';
import OutboundManager from './pages/OutboundManager';
import InboundReport from './pages/InboundReport';
import ProcessReport from './pages/ProcessReport';
import OutboundReport from './pages/OutboundReport';
import OpSplit from './pages/OpSplit';
import OpRepack from './pages/OpRepack';
import OpAudit from './pages/OpAudit';
import OpReplenish from './pages/OpReplenish';
import OpTransfer from './pages/OpTransfer';
import RoadMap from './pages/RoadMap';

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
      case 'orders': return <OutboundManager onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} />;
      case 'orderDetail': return <OrderDetail orderCode={selectedOrderCode} onBack={() => setActivePage('grp_outbound')} />;
      case 'taskProgress': return <TaskProgress />;
      case 'staffCheckIn': return <StaffCheckIn onExit={() => setActivePage('dashboard')} user={user} />;
      case 'staffAdmin': return <StaffAdmin />;
      case 'scanner': return <BarcodeScanner />;
      
      // Đơn nhập
      case 'grp_inbound': return <InboundManager onReceive={(code) => { setSelectedPOCode(code); setActivePage('inbound_receive'); }} />;
      case 'inbound_new': return <InboundManager onReceive={(code) => { setSelectedPOCode(code); setActivePage('inbound_receive'); }} initialTab="inbound_new" />;
      case 'inbound_list': return <InboundManager onReceive={(code) => { setSelectedPOCode(code); setActivePage('inbound_receive'); }} initialTab="inbound_list" />;
      case 'inbound_receive': return <InboundReceive poCode={selectedPOCode || ''} onBack={() => setActivePage('grp_inbound')} />;
      case 'inbound_return': return <InboundManager onReceive={(code) => { setSelectedPOCode(code); setActivePage('inbound_receive'); }} initialTab="inbound_return" />;
      case 'inbound_internal': return <InboundManager onReceive={(code) => { setSelectedPOCode(code); setActivePage('inbound_receive'); }} initialTab="inbound_internal" />;
      
      // Xử lý đơn
      case 'proc_list': return <OutboundManager onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} />;
      case 'proc_pick': return <Picking />;
      case 'proc_pack': return <Packing />;
      case 'proc_route': return <Routing />;
      
      // Đơn xuất
      case 'grp_outbound': return <OutboundManager onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} />;
      case 'outbound_list': return <OutboundManager onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} initialTab="outbound_list" />;
      case 'outbound_pending': return <OutboundManager onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} initialTab="outbound_pending" />;
      case 'outbound_done': return <OutboundManager onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} initialTab="outbound_done" />;
      case 'outbound_cancel': return <OutboundManager onViewDetail={(id) => { setSelectedOrderCode(id); setActivePage('orderDetail'); }} initialTab="outbound_cancel" />;
      
      // Kho hàng & Danh mục quản trị
      case 'product_list': return <ProductList />;
      case 'supplier_list': return <SupplierList />;
      case 'customer_list': return <CustomerList />;
      case 'wh_list': 
      case 'wh_location': return <WarehouseLocation />;
      case 'wh_map': return <WarehouseMap />;
      case 'wh_stock': return <ComingSoon title="Tồn kho" />;
      
      // Báo cáo
      case 'rpt_inbound': return <InboundReport />;
      case 'rpt_proc': return <ProcessReport />;
      case 'rpt_outbound': return <OutboundReport />;
      case 'rpt_xnt': return <InventoryReport />;

      // Vận hành
      case 'op_split': return <OpSplit />;
      case 'op_repack': return <OpRepack />;
      case 'op_audit': return <OpAudit />;
      case 'op_replenish': return <OpReplenish />;
      case 'op_transfer': return <OpTransfer />;
      
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

      // Road Map
      case 'roadmap': return <RoadMap user={user} />;

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
