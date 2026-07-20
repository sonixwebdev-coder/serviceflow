import {
  Activity,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  Umbrella,
  UserCircle,
  Users,
} from 'lucide-react';

import { USER_ROLES } from '@/utils/constants';

const SECTION_KEYS = ['crm', 'echipa', 'setari'];

export const buildDashboardNavigation = (hasAssets) => {
  const crmChildren = [
    { name: 'Programari', href: '/crm/appointments', icon: CalendarDays, roles: [] },
    { name: 'Clienti', href: '/crm/clients', icon: UserCircle, roles: [] },
    { name: 'Clienti Online', href: '/crm/online-clients', icon: Globe, roles: [] },
    {
      name: 'Facturi',
      href: '/crm/invoices',
      icon: FileText,
      roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.SALES],
    },
    {
      name: 'Fidelitate',
      href: '/crm/loyalty',
      icon: Gift,
      roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
    },
  ];

  if (hasAssets) {
    crmChildren.splice(3, 0, {
      name: 'Active',
      href: '/crm/assets',
      icon: Package,
      roles: [],
    });
  }

  return [
    { name: 'Tablou de bord', href: '/dashboard', icon: LayoutDashboard, roles: [] },
    { name: 'CRM', key: 'crm', icon: Briefcase, roles: [], children: crmChildren },
    {
      name: 'Echipa & Pontaj',
      key: 'echipa',
      icon: Users,
      roles: [],
      children: [
        { name: 'Task-uri', href: '/tasks', icon: ClipboardList, roles: [] },
        { name: 'Todo-uri Personale', href: '/personal-todos', icon: CheckSquare, roles: [] },
        { name: 'Pontaj', href: '/time-tracking', icon: Clock, roles: [] },
        { name: 'Cereri concediu', href: '/leaves', icon: Umbrella, roles: [] },
        { name: 'Angajati', href: '/employees', icon: Users, roles: [USER_ROLES.ADMIN] },
      ],
    },
    { name: 'Chat', href: '/chat', icon: MessageSquare, roles: [] },
    {
      name: 'Activitate',
      href: '/activity',
      icon: Activity,
      roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
    },
    {
      name: 'Statistici',
      href: '/analytics',
      icon: BarChart3,
      roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
    },
    {
      name: 'Setari',
      key: 'setari',
      icon: Settings,
      roles: [USER_ROLES.ADMIN],
      children: [
        {
          name: 'Setari companie',
          href: '/settings/company',
          icon: Settings,
          roles: [USER_ROLES.ADMIN],
        },
        {
          name: 'Setari organizatie',
          href: '/settings/organization',
          icon: Settings,
          roles: [USER_ROLES.ADMIN],
        },
        { name: 'Locatii', href: '/settings/locations', icon: MapPin, roles: [USER_ROLES.ADMIN] },
        {
          name: 'Servicii',
          href: '/settings/services',
          icon: Briefcase,
          roles: [USER_ROLES.ADMIN],
        },
        { name: 'Website', href: '/settings/website', icon: Globe, roles: [USER_ROLES.ADMIN] },
        {
          name: 'Template-uri Email',
          href: '/settings/email-templates',
          icon: Mail,
          roles: [USER_ROLES.ADMIN],
        },
        { name: 'Fidelitate', href: '/settings/loyalty', icon: Gift, roles: [USER_ROLES.ADMIN] },
        {
          name: 'Abonament',
          href: '/settings/billing',
          icon: CreditCard,
          roles: [USER_ROLES.ADMIN],
        },
      ],
    },
    { name: 'Suport', href: '/support', icon: LifeBuoy, roles: [] },
  ];
};

export const filterNavigationByRole = (navigation, hasRole) =>
  navigation.filter((item) => item.roles.length === 0 || hasRole(...item.roles));

export const expandedSectionsForPath = (navigation, pathname) => {
  const activeSection = navigation.find((item) =>
    item.children?.some((child) => pathname === child.href)
  );
  if (!activeSection) return null;

  return Object.fromEntries(SECTION_KEYS.map((key) => [key, key === activeSection.key]));
};
