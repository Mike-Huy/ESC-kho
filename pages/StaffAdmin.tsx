import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const StaffAdmin: React.FC = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'supabase' | 'local'>('supabase');
  const [stats, setStats] = useState({ present: 0, total: 0 });

  // Dữ liệu mẫu Fallback
  const mockStaff = [
    { id: 1, name: 'Nguyễn Văn A', code: 'NV-001', dept: 'Kho vận', position: 'Quản lý kho', status: 'working', in: '07:45', out: '--', total: '4h 30m', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVzLvkJIdAaJAEd2-mZQ2Exovadg1pYx3BKGoMeVNkIUaI4hRmWdFDXX9VUlqPMwE9r-Xm4zpP9cAqP-wfts5jJOB5LPtA6l7d0W__i7xCJ2fJ40GhBnkiMg6LzBuBtruLnrV8xzyldIKZzpgkpjIAqP6PwlRyrMHKrbXKsXIb_31U66S9kGs-uHj6c8EEBXrNnnmkhICniJKNVAPl9oZIQqiNkera16ObwENxA1DXo1B1Gh1hPg3CwVUol05bFhuBjNmiBTjLK5WA' },
    { id: 2, name: 'Trần Thị B', code: 'NV-002', dept: 'Kế toán', position: 'Kế toán kho', status: 'working', in: '08:00', out: '--', total: '4h 15m', avatar: '' },
    { id: 3, name: 'Lê Văn C', code: 'NV-003', dept: 'Vận chuyển', position: 'Tài xế', status: 'off', in: '--', out: '--', total: '0h', avatar: '' },
    { id: 4, name: 'Phạm Minh D', code: 'NV-004', dept: 'Kho vận', position: 'Nhân viên bốc xếp', status: 'working', in: '07:50', out: '--', total: '4h 25m', avatar: '' },
    { id: 5, name: 'Hoàng Thị E', code: 'NV-005', dept: 'Kiểm kê', position: 'Kiểm soát viên', status: 'break', in: '08:00', out: '--', total: '4h 15m', avatar: '' },
  ];

  // Hàm tính thời gian làm việc
  const calculateDuration = (checkInStr: string | null) => {
    if (!checkInStr) return '0h';
    try {
        const now = new Date();
        const [hours, minutes] = checkInStr.split(':').map(Number);
        const checkIn = new Date();
        checkIn.setHours(hours, minutes, 0);
        
        // Nếu giờ checkin lớn hơn giờ hiện tại (có thể do khác ngày hoặc lỗi), trả về 0
        if (checkIn > now) {
             // Thử lùi lại 1 ngày (ca đêm) hoặc trả về 0. Ở đây đơn giản trả về tính từ lúc đó.
             // Để đơn giản cho demo, giả sử cùng ngày
             return 'Đang tính';
        }

        const diffMs = now.getTime() - checkIn.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHrs}h ${diffMins}m`;
    } catch (e) {
        return '0h';
    }
  };

  useEffect(() => {
    const fetchStaff = async () => {
       try {
         setLoading(true);
         
         // Lấy dữ liệu từ bảng 'staff'
         const { data, error } = await supabase
           .from('staff')
           .select('*')
           .order('full_name', { ascending: true });

         if (error) throw error;

         if (data && data.length > 0) {
           setSource('supabase');
           const mappedStaff = data.map((item: any) => ({
             id: item.id,
             name: item.full_name,
             code: item.employee_code,
             dept: item.department,
             position: item.position,
             status: item.status || 'off', 
             in: item.check_in_time ? String(item.check_in_time).substring(0, 5) : '--',
             out: '--', 
             total: calculateDuration(item.check_in_time),
             avatar: item.avatar_url
           }));
           
           setStaffList(mappedStaff);
           setStats({
             present: mappedStaff.filter((s:any) => s.status === 'working' || s.status === 'break').length,
             total: mappedStaff.length
           });
         } else {
           // Fallback nếu Supabase chưa có data
           console.log('No data in Supabase staff table, using mock.');
           setSource('local');
           setStaffList(mockStaff);
           setStats({
             present: mockStaff.filter((s:any) => s.status === 'working' || s.status === 'break').length,
             total: mockStaff.length
           });
         }
       } catch (error: any) {
         console.error('Error fetching staff (using mock):', error);
         setSource('local');
         setStaffList(mockStaff);
         setStats({
             present: mockStaff.filter((s:any) => s.status === 'working' || s.status === 'break').length,
             total: mockStaff.length
         });
       } finally {
         setLoading(false);
       }
    };
    fetchStaff();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý Nhân viên & Chấm công</h1>
            {source === 'local' && (
                <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                    <span className="material-icons-round text-sm">warning</span>
                    Đang hiển thị dữ liệu mẫu (Kiểm tra lại kết nối Supabase)
                </p>
            )}
        </div>
        <button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all">
           <span className="material-icons-round text-sm">add_circle</span> Thêm nhân viên
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { title: 'Nhân viên hiện diện', val: stats.present.toString(), sub: `/ ${stats.total}`, icon: 'groups', color: 'primary', footer: 'Tỷ lệ có mặt hôm nay', footerIcon: 'trending_up', footerColor: 'emerald' },
           { title: 'Chờ phê duyệt công', val: '12', icon: 'pending_actions', color: 'primary', footer: 'Cần xử lý trước 17:00', footerIcon: 'priority_high', footerColor: 'amber' },
           { title: 'Tăng ca dự kiến', val: '08', icon: 'more_time', color: 'primary', footer: 'Khu vực Đóng gói', footerIcon: 'info', footerColor: 'blue' },
           { title: 'Vắng mặt', val: (stats.total - stats.present).toString(), icon: 'person_off', color: 'primary', footer: 'Nghỉ phép & Không phép', footerIcon: 'report_problem', footerColor: 'red', valColor: 'red' }
         ].map((card, idx) => (
           <div key={idx} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-500 text-sm font-semibold mb-1">{card.title}</p>
                    <h3 className={`text-3xl font-bold ${card.valColor ? 'text-red-600' : 'text-slate-900'}`}>{card.val} <span className="text-lg font-normal text-slate-400">{card.sub}</span></h3>
                 </div>
                 <div className="bg-blue-50 text-primary p-2 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-icons-round">{card.icon}</span>
                 </div>
              </div>
              <div className={`mt-4 flex items-center gap-2 text-xs font-bold text-${card.footerColor}-600`}>
                 <span className="material-icons-round text-sm">{card.footerIcon}</span>
                 <span>{card.footer}</span>
              </div>
           </div>
         ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white">
            <div className="flex items-center gap-4 flex-1">
               <div className="relative flex-1 max-w-md">
                  <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-all" placeholder="Tìm kiếm tên nhân viên, mã số..." type="text" />
               </div>
            </div>
         </div>
         <div className="overflow-x-auto">
            {loading ? (
               <div className="p-8 text-center text-slate-500">Đang tải dữ liệu nhân sự...</div>
            ) : (
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                     <th className="px-6 py-4">Nhân viên</th>
                     <th className="px-6 py-4">Bộ phận / Vị trí</th>
                     <th className="px-6 py-4">Trạng thái</th>
                     <th className="px-6 py-4 text-center">Giờ vào</th>
                     <th className="px-6 py-4 text-center">Giờ ra</th>
                     <th className="px-6 py-4 text-center">Thời gian làm</th>
                     <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {staffList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                {row.avatar ? (
                                    <img src={row.avatar} className="w-full h-full object-cover" alt={row.name}/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                        <span className="material-icons-round">person</span>
                                    </div>
                                )}
                             </div>
                             <div>
                                <div className="text-sm font-bold text-slate-900">{row.name}</div>
                                <div className="text-xs text-slate-500 font-medium">MSNV: {row.code}</div>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                           <div className="flex flex-col">
                               <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 w-fit mb-1">{row.dept}</span>
                               <span className="text-[10px] text-slate-500 font-medium">{row.position}</span>
                           </div>
                       </td>
                       <td className="px-6 py-4">
                          {row.status === 'working' ? (
                             <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Đang làm việc</div>
                          ) : row.status === 'break' ? (
                             <div className="flex items-center gap-2 text-amber-600 text-sm font-bold"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Nghỉ giữa ca</div>
                          ) : (
                             <div className="flex items-center gap-2 text-slate-400 text-sm font-bold"><span className="w-2 h-2 bg-slate-300 rounded-full"></span> Nghỉ ca</div>
                          )}
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-sm text-slate-700">{row.in}</td>
                       <td className="px-6 py-4 text-center font-medium text-sm text-slate-400">{row.out}</td>
                       <td className="px-6 py-4 text-center text-sm font-extrabold text-slate-900">{row.total}</td>
                       <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-primary"><span className="material-icons-round">edit</span></button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
            )}
         </div>
      </div>
    </div>
  );
};

export default StaffAdmin;