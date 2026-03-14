export type PageType = 
  | 'dashboard'
  | 'inventory'
  | 'costs'
  | 'rackMap'
  | 'orders'
  | 'orderDetail'
  | 'staffCheckIn'
  | 'staffAdmin'
  | 'scanner'
  | 'taskProgress'
  | 'putAway'
  // Đơn nhập
  | 'inbound_new' | 'inbound_return' | 'inbound_internal'
  // Xử lý đơn
  | 'proc_list' | 'proc_pick' | 'proc_pack' | 'proc_route'
  // Đơn xuất
  | 'outbound_pending' | 'outbound_done' | 'outbound_cancel'
  // Kho hàng
  | 'wh_list' | 'wh_map' | 'wh_location' | 'wh_stock'
  // Báo cáo
  | 'rpt_inbound' | 'rpt_proc' | 'rpt_outbound' | 'rpt_inventory'
  // Vận hành
  | 'op_split' | 'op_repack' | 'op_audit' | 'op_replenish' | 'op_transfer'
  // Tài chính
  | 'fin_wh' | 'fin_op' | 'fin_hr' | 'fin_supplies' | 'fin_maint'
  // Cài đặt
  | 'set_staff' | 'set_salary' | 'set_permissions'
  // Nhân sự
  | 'hr_staff_list' | 'hr_salary_level' | 'hr_shifts' | 'hr_policy';

export interface NavItem {
  id: PageType | string;
  label: string;
  icon: string;
  children?: NavItem[];
}

export interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  colorClass: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
}

export interface Order {
  id: string;
  customer: string;
  email: string;
  status: 'new' | 'processing' | 'shipped' | 'cancelled' | 'pending';
  date: string;
  total: string;
}
