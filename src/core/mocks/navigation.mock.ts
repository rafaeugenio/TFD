import { NavItem } from '../models/navigation.model';

export const MOCK_NAVIGATION: NavItem[] = [
  {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
  },
  {
    label: 'Solicitacoes',
    icon: 'FileText',
    path: '/solicitacoes',
    badge: 14,
  },
  {
    label: 'Regulacao',
    icon: 'ClipboardCheck',
    path: '/regulacao',
    badge: 5,
  },
  {
    label: 'Agendamentos',
    icon: 'MapPin',
    path: '/atendimento-destino',
  },
  {
    label: 'Viagens',
    icon: 'Plane',
    path: '/viagens',
    badge: 3,
  },
  {
    label: 'Ajuda de Custo',
    icon: 'Wallet',
    path: '/ajuda-custo',
  },
  {
    label: 'Permanencia',
    icon: 'CalendarClock',
    path: '/permanencia',
  },
  {
    label: 'Altas',
    icon: 'LogOut',
    path: '/alta-encerramento',
  },
  {
    label: 'Relatorios',
    icon: 'BarChart3',
    path: '/relatorios',
  },
  {
    label: 'Configuracoes',
    icon: 'Settings',
    path: '/configuracoes',
  },
];
