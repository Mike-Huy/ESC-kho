import React, { useState, useEffect } from 'react';
import { Layout, UserData } from './components/Layout';
import LoginPopup from './components/LoginPopup';
import { PageType } from './types';
import Dashboard from './pages/Dashboard';
import InventoryReport from './pages/InventoryReport';
import CostAnalysis from './pages/CostAnalysis';
import RackMap from './pages/RackMap';
import PutAway from './pages/PutAway';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import TaskProgress from './pages/TaskProgress';
import StaffCheckIn from './pages/StaffCheckIn';
import StaffAdmin from './pages/StaffAdmin';
import BarcodeScanner from './pages/BarcodeScanner';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageType>('dashboard');
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
      case 'orders': return <OrderList onViewDetail={() => setActivePage('orderDetail')} />;
      case 'orderDetail': return <OrderDetail onBack={() => setActivePage('orders')} />;
      case 'taskProgress': return <TaskProgress />;
      case 'staffCheckIn': return <StaffCheckIn onExit={() => setActivePage('dashboard')} />;
      case 'staffAdmin': return <StaffAdmin />;
      case 'scanner': return <BarcodeScanner />;
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
