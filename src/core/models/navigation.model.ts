export interface NavItem {
  label: string;
  icon: string; // lucide icon name
  path: string;
  badge?: number;
  children?: NavItem[];
}
