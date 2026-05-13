import React, { useState, useEffect } from 'react';
import { Layout, UserData } from './components/Layout';
import LoginPopup from './components/LoginPopup';
import ComingSoon from './components/ComingSoon';
import { PageType } from './types';
import { supabase, TABLE } from './supabaseClient';
import { APP_CONFIG } from './appConfig';
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
      const parsedUser = JSON.parse(savedUser) as UserData;
      setUser(parsedUser);

      // Async background refresh of user session/permissions from database
      const refreshUserSession = async () => {
        try {
          // Báo cho DB biết user_id trước khi query
          await supabase.rpc('set_app_user', { uid: parsedUser.id });

          // Step 1: Fetch latest user record (to get updated name/status/is_super_admin)
          const { data: userRecord, error: userError } = await supabase
            .from(TABLE('users'))
            .select('id, phone, full_name, nick_name, avatar, user_type, is_active, is_super_admin, website_id')
            .eq('id', parsedUser.id)
            .single();

          if (userError || !userRecord) return;

          // Step 2: Fetch latest staff profile
          const { data: staffProfile } = await supabase
            .from(TABLE('staff_profiles'))
            .select('id, user_id, erp_role_id, is_super_admin, allowed_modules, website_id')
            .eq('user_id', parsedUser.id)
            .single();

          // Fetch role info if applicable
          let erp_role: { name: string; label: string; color: string } | null = null;
          if (staffProfile?.erp_role_id) {
            const { data: roleData } = await supabase
              .from(TABLE('erp_roles'))
              .select('name, label, color')
              .eq('id', staffProfile.erp_role_id)
              .single();
            erp_role = roleData;
          }

          // Step 3: Determine permissions source
          let allowedModules: string[] = [];
          let roleLabel: string | null = null;
          let roleName:  string | null = null;
          let roleColor: string | null = null;
          let permSource: 'super_admin' | 'direct' | 'role' | 'cache' = 'cache';

          const isSuperAdminUser = userRecord.is_super_admin === true || staffProfile?.is_super_admin === true;

          if (isSuperAdminUser) {
            allowedModules = ['inbound','orders','outbound','inventory','reports','operation','hr','finance','settings','roadmap'];
            roleLabel = 'Super Admin';
            roleName  = 'super_admin';
            roleColor = '#ef4444';
            permSource = 'super_admin';
          } else {
            // Fetch direct permissions
            const { data: directPerms } = await supabase
              .from(TABLE('user_permissions'))
              .select('module, can_read, can_add, can_edit, can_delete')
              .eq('user_id', parsedUser.id)
              .contains('website_id', [APP_CONFIG.WEBSITE_ID]);

            if (directPerms && directPerms.length > 0) {
              allowedModules = directPerms
                .filter((p: any) => p.can_read === true)
                .map((p: any) => p.module);
              roleLabel  = 'Quyền trực tiếp';
              roleName   = 'custom_permissions';
              roleColor  = '#ec4899';
              permSource = 'direct';
            } else if (staffProfile?.erp_role_id) {
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
              allowedModules = staffProfile?.allowed_modules || [];
              roleLabel  = erp_role?.label || null;
              roleName   = erp_role?.name  || null;
              roleColor  = erp_role?.color || null;
              permSource = 'cache';
            }
          }

          const updatedUserData: UserData = {
            id: userRecord.id,
            phone: userRecord.phone,
            full_name: userRecord.full_name,
            nick_name: userRecord.nick_name || undefined,
            avatar: userRecord.avatar || undefined,
            isSuperAdmin: isSuperAdminUser,
            allowedModules: allowedModules,
            roleLabel: roleLabel || undefined,
            roleName: roleName || undefined,
            roleColor: roleColor || undefined,
          };

          // Only update if there is actually a change to avoid infinite renders/flickers
          if (JSON.stringify(parsedUser) !== JSON.stringify(updatedUserData)) {
            console.log(`[Session Sync] Updating user permissions in background (${permSource}):`, allowedModules);
            localStorage.setItem('wms_user', JSON.stringify(updatedUserData));
            setUser(updatedUserData);
          }
        } catch (error) {
          console.error('[Session Sync] Error background refreshing user session:', error);
        }
      };

      refreshUserSession();
    }
    setIsInitialized(true);
  }, []);

  // Sync database RLS session state whenever user or active page changes.
  // This ensures that even if connection pooling (PgBouncer) recycles the connection,
  // the current user session context is always refreshed before queries execute.
  useEffect(() => {
    if (user && user.id) {
      const syncSession = async () => {
        try {
          await supabase.rpc('set_app_user', { uid: user.id });
          console.log(`[RLS Sync] Successfully refreshed DB session for user ${user.id} on page "${activePage}"`);
        } catch (err) {
          console.error('[RLS Sync] Failed to refresh DB session:', err);
        }
      };
      syncSession();
    }
  }, [activePage, user]);

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
      case 'inventory_xnt':
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
