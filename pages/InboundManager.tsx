import React, { useState } from 'react';
import InboundNew from './InboundNew';
import InboundList from './InboundList';
import InboundReturn from './InboundReturn';
import InternalProcess from './InternalProcess';

interface InboundManagerProps {
  onReceive: (poCode: string) => void;
  initialTab?: 'inbound_new' | 'inbound_list' | 'inbound_return' | 'inbound_internal';
}

const InboundManager: React.FC<InboundManagerProps> = ({ onReceive, initialTab = 'inbound_new' }) => {
  const [activeTab, setActiveTab] = useState<'inbound_new' | 'inbound_list' | 'inbound_return' | 'inbound_internal'>(initialTab);

  const tabs = [
    { id: 'inbound_new', label: 'Tạo hàng mới', icon: 'add_shopping_cart' },
    { id: 'inbound_list', label: 'Danh sách đơn', icon: 'list_alt' },
    { id: 'inbound_return', label: 'Hàng trả', icon: 'settings_backup_restore' },
    { id: 'inbound_internal', label: 'Xử lý nội bộ', icon: 'sync_alt' },
  ] as const;

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'inbound_new':
        return <InboundNew hideHeader={true} />;
      case 'inbound_list':
        return (
          <InboundList 
            onReceive={onReceive} 
            onNew={() => setActiveTab('inbound_new')} 
            hideHeader={true} 
          />
        );
      case 'inbound_return':
        return <InboundReturn hideHeader={true} />;
      case 'inbound_internal':
        return <InternalProcess hideHeader={true} />;
      default:
        return <InboundNew hideHeader={true} />;
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
                <span className="material-icons-round text-xl">login</span>
              </span>
              Quản lý Đơn Nhập
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1.5 ml-1">Khu vực kiểm tra và tạo đơn hàng nhập kho</p>
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

export default InboundManager;
