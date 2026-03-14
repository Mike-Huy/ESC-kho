import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface TaskItem {
  name: string;
  sku: string;
  progress: number;
  time: string;
  gate: string;
  img: string;
  urgent?: boolean;
  completed?: boolean;
}

interface TaskColumn {
  title: string;
  count: number;
  color: string;
  progress: number;
  items: TaskItem[];
}

const MOCK_TASKS = [
  // Nhập hàng
  { title: 'Nhập hàng', assignee_name: 'Nguyễn Văn An', sku: '#WH-0921', progress: 35, time_spent: '24 phút', gate: 'CỬA 04', urgent: false, completed: false, assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBihnpyFGBar45pyRCvf0YO5fTfkgmHS_ewTICw-FIHC4k7eZrwxlNTG_ejBW-Zh-XLZZUoV7d-PBjD5_asITugvIVMq6AJXsaVvNelTcZ8Vo6KJhV07AoVBg-txyIlMRnsWBp6-TeW0uuO9B3KEa7vLyQfNIsnVT-s07eBVFcSjq3h2aaBKdAWQYsq7U3b9cTDbEmCxwBo-aDP0QLNzlWCeQ96oMRnORkmSLo-QfV-s5uKFFadlncOuRLsNkeM9wNfSciQf2Lo9ixA' },
  { title: 'Nhập hàng', assignee_name: 'Lê Thị Mai', sku: '#WH-1044', progress: 82, time_spent: '48 phút', gate: 'CỬA 02', urgent: false, completed: false, assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNKZkn5XlHHheEPxaB4XvHSkuU8s4pSJTbrJEllE8uEqNSpWMSbWn43NsibSZzL7gYhoDy0z48RQsTgbGFtY28xUY4AeE4ZdQNZjev-oA1gvlwNWWRaML2FZDPejmBdPdz_nlcqbJBpifRP7YEtQ2hDnpK879sSH0l8SMVa8SdKSF4N-gvh-VWsbrBPJCxgeD5Pp5BzJRDgcBqNYIsY02SCQ6Gd4Y_7ibClYcT2vvpRcdfvJxNu3FOgzukJtjhRzOc9rR5YUKhNCaU' },
  // Lấy hàng
  { title: 'Lấy hàng', assignee_name: 'Trần Văn Tú', sku: '#ORD-5521', progress: 80, time_spent: 'Sắp quá hạn', gate: 'KHU A-12', urgent: true, completed: false, assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBt4KT3yUqkYt_-ZLKmvN1MwbeywM3dn2RC1kZac6JLqikYYrTOoIExxCCce_eFqcaY4zAX35G2_5IES0pwqPIOFRNjsh9FMxsudjOmstGQotY7NfOnKc7FqLzOT8w_D7eee4ZSXMRxR7k4qhYAJPrh-vs2E6TAEiKGa9elAPM4K0On4zvQKeiqobYliz6Cs7Oh7WyFYaNNQ_IcN8y_7cYGd9ke5wB_ws2a1vz5xZN100qvbd8U03s7M5MMt0aG5nFEW_atQsIE66GG' },
  { title: 'Lấy hàng', assignee_name: 'Phạm Minh Hoàng', sku: '#ORD-5530', progress: 33, time_spent: '12 phút', gate: 'KHU C-04', urgent: false, completed: false, assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0CUqSssaa02vm8Ej7_WxVObdlQJ_5jVSP4OuoGHhbfEPaB2jzXqALUZyqoDnl3R2dhZ23e_fQVWmoZeWnf36uEU3W7-mc0LE8ElsZDKIkk3PqkuVWM4cqBNaq8amF6MQMDp6aLSYrkQFM3njrPilI5oChZelEL74wYfMc9jA32FxunPmrpwqd8VqcPInOPWOiYYH_B6m-UalJjcMz3V7FYCM4cqAuQQ90xjOkjXzUKUVekltKZylQhg91DiCKlKHQHWafDd7rY-cl' },
  // Đóng gói
  { title: 'Đóng gói', assignee_name: 'Võ Thị Kim Chi', sku: '#PKG-902', progress: 100, time_spent: 'Đang kiểm QC', gate: 'BÀN 08', urgent: false, completed: true, assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgaM5HNYIebJel0JbLf3f5arl_ZmMn74hjeFIqStT8GUlpQRiE_1cpgipFnlXI-EQ4V67npMy4LXOCy8xn_CU9mFzFH0s6GzKMhppgti0FDBspaXRm8INCUsVOqOZtQpTW7Eo0tmKO-rnZOIRtsjbqMzw4R94AytdXGjlqzUmgq5DUFMsye8NMY5ivHUaFXMzZknS0gE7jhBBPvwrngTqQlfFv7vttd0l5g63Yg9TEncNcUSkSdHCvVGeTE0rq-EWwz9Xnu9zrbM_E' },
  // Giao hàng
  { title: 'Giao hàng', assignee_name: 'Hoàng Gia Bảo', sku: '#SG-99-231', progress: 15, time_spent: 'GHTK Last Mile', gate: 'DOCK 01', urgent: false, completed: false, assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuY-0ZBltc_Tc-v4JCfc0KyS8jEfY51a_UcE17AXpJIG_qo6hzPUS3_l7KUZwtb__JwlKXTRzzu_wUIB75dLwcFqBilKdYONt87KqSloDJGgbiPXxONUAecbVS2IS0OkB2TpPwaOyCCXXzfkETlkwOlxftIj_amm3AQSUfLsBa-25FcT50H8MFMu4OAaSYRW2eje0iTp1RPY-OEZnhfTAyYXDyK2a3Nr3jtd5BFgTXgXxdbKJs4oIHqENZO6Ha0TSQSsSq4jo-x61O' },
];

const TaskProgress: React.FC = () => {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [loading, setLoading] = useState(true);

  // Hàm chuyển đổi dữ liệu phẳng (flat list) sang dạng cột (columns)
  const processTasks = (tasks: any[]) => {
    const categories = [
        { key: 'Nhập hàng', label: 'Nhập hàng', total: 45 }, 
        { key: 'Lấy hàng', label: 'Lấy hàng (Picking)', total: 65 }, 
        { key: 'Đóng gói', label: 'Đóng gói', total: 30 }, 
        { key: 'Giao hàng', label: 'Giao hàng', total: 20 }
    ];

    const newColumns = categories.map(cat => {
        const catTasks = tasks.filter(t => t.title === cat.key || (cat.key === 'Lấy hàng' && t.title === 'Lấy hàng'));
        const mappedItems: TaskItem[] = catTasks.map(t => ({
            name: t.assignee_name,
            sku: t.sku,
            progress: t.progress,
            time: t.time_spent,
            gate: t.gate,
            img: t.assignee_avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVzLvkJIdAaJAEd2-mZQ2Exovadg1pYx3BKGoMeVNkIUaI4hRmWdFDXX9VUlqPMwE9r-Xm4zpP9cAqP-wfts5jJOB5LPtA6l7d0W__i7xCJ2fJ40GhBnkiMg6LzBuBtruLnrV8xzyldIKZzpgkpjIAqP6PwlRyrMHKrbXKsXIb_31U66S9kGs-uHj6c8EEBXrNnnmkhICniJKNVAPl9oZIQqiNkera16ObwENxA1DXo1B1Gh1hPg3CwVUol05bFhuBjNmiBTjLK5WA', // Fallback avatar
            urgent: t.urgent,
            completed: t.completed
        }));

        return {
            title: cat.label,
            count: mappedItems.length,
            color: 'primary',
            progress: cat.total, // Trong thực tế, cái này nên được tính toán dựa trên avg progress
            items: mappedItems
        };
    });
    setColumns(newColumns);
  };

  useEffect(() => {
    const fetchTasks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('tasks').select('*');
            
            if (error) throw error;

            if (data && data.length > 0) {
                processTasks(data);
            } else {
                processTasks(MOCK_TASKS);
            }
        } catch (error) {
            console.warn('Error fetching tasks (using mock):', error);
            processTasks(MOCK_TASKS);
        } finally {
            setLoading(false);
        }
    };
    fetchTasks();
  }, []);

  return (
    <div className="p-6 max-w-[1920px] mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Tiến độ Công việc Nhân viên</h2>
            <p className="text-sm text-slate-500">Giám sát hoạt động vận hành thời gian thực theo từng bộ phận</p>
         </div>
         <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <span className="material-icons-round text-sm">add_task</span> Giao việc mới
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-[600px] overflow-hidden">
        {loading ? (
            <div className="col-span-4 flex items-center justify-center text-slate-400">Đang tải tiến độ...</div>
        ) : (
            columns.map((col, idx) => (
            <div key={idx} className="flex flex-col gap-4 bg-slate-200/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-200/50 h-full">
                <div className="px-3 py-2">
                    <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-6 bg-primary rounded-full"></div>
                        <h2 className="font-bold text-sm text-slate-800 tracking-tight uppercase">{col.title}</h2>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px] font-bold">{col.count}</span>
                    </div>
                    <div className="w-full bg-slate-300 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{width: `${col.progress}%`}}></div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 px-1">
                    {col.items.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs italic">Không có nhiệm vụ</div>
                    ) : (
                        col.items.map((item, itemIdx) => (
                        <div key={itemIdx} className={`bg-white p-4 rounded-xl border ${item.urgent ? 'border-2 border-orange-500 shadow-lg shadow-orange-100' : 'border-slate-200 shadow-sm'} hover:shadow-md transition-all cursor-pointer relative overflow-hidden group`}>
                            {item.urgent && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">Hỏa Tốc</div>}
                            <div className="flex items-start mb-4 gap-3">
                                <img className="w-9 h-9 rounded-full border border-slate-100 object-cover" src={item.img} alt={item.name}/>
                                <div>
                                <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{item.sku}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-500">Tiến độ</span>
                                <span className={item.urgent ? 'text-orange-500' : item.completed ? 'text-green-600' : 'text-primary'}>{item.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.urgent ? 'bg-orange-500' : item.completed ? 'bg-green-500' : 'bg-primary'}`} style={{width: `${item.progress}%`}}></div>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${item.urgent ? 'text-red-500' : 'text-slate-400'}`}>
                                    <span className="material-icons-round text-[14px]">{item.completed ? 'check_circle' : (item.urgent ? 'warning' : 'access_time')}</span>
                                    <span>{item.time}</span>
                                </div>
                                <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{item.gate}</span>
                                </div>
                            </div>
                        </div>
                        ))
                    )}
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default TaskProgress;