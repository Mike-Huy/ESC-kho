import React, { useState, useEffect } from 'react';
import OrderList from './OrderList';

interface OutboundManagerProps {
  onViewDetail: (orderCode: string) => void;
  initialTab?: 'outbound_list' | 'outbound_pending' | 'outbound_done' | 'outbound_cancel';
}

const OutboundManager: React.FC<OutboundManagerProps> = ({ onViewDetail, initialTab = 'outbound_list' }) => {
  const [activeTab, setActiveTab] = useState<'outbound_list' | 'outbound_pending' | 'outbound_done' | 'outbound_cancel'>(initialTab);

  // Keep activeTab in sync with initialTab prop when routes change
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabs = [
    { id: 'outbound_list', label: 'Danh sách đơn xuất', icon: 'receipt_long' },
    { id: 'outbound_pending', label: 'Đơn chờ xuất', icon: 'pending_actions' },
    { id: 'outbound_done', label: 'Đơn đã xuất', icon: 'task_alt' },
    { id: 'outbound_cancel', label: 'Đơn hủy', icon: 'cancel' },
  ] as const;

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'outbound_list':
        return <OrderList statusFilter="" hideHeader={true} onViewDetail={onViewDetail} />;
      case 'outbound_pending':
        return <OrderList statusFilter="pending_proc" hideHeader={true} onViewDetail={onViewDetail} />;
      case 'outbound_done':
        return <OrderList statusFilter="completed" hideHeader={true} onViewDetail={onViewDetail} />;
      case 'outbound_cancel':
        return <OrderList statusFilter="cancelled" hideHeader={true} onViewDetail={onViewDetail} />;
      default:
        return <OrderList statusFilter="" hideHeader={true} onViewDetail={onViewDetail} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light">
      {/* Premium Tab Bar Container */}
      <div className="bg-white border-b border-border-light shadow-sm px-6 lg:px-10 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-3 text-slate-900 leading-none">
              <span className="p-2 bg-blue-50 text-primary rounded-xl flex items-center justify-center">
                <span className="material-icons-round text-xl">logout</span>
              </span>
              Quản lý Đơn Xuất
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1.5 ml-1">Khu vực kiểm tra và theo dõi đơn hàng xuất kho</p>
          </div>

          {/* Premium Modern Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50 self-start md:self-auto shadow-inner">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative ${
                    isActive 
                      ? 'bg-white text-primary shadow-md shadow-blue-500/5' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/30'
                  }`}
                >
                  <span className="material-icons-round text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Render selected tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderActiveTabContent()}
        </div>
      </div>
    </div>
  );
};

export default OutboundManager;
