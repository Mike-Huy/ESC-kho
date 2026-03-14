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
  | 'putAway';

export interface NavItem {
  id: PageType;
  label: string;
  icon: string;
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
  status: 'new' | 'processing' | 'shipped' | 'cancelled';
  date: string;
  total: string;
}
