import type { NavItem } from '../../components/SideBar/NavItem';

export function withTecnicoTicketsNav(
  items: NavItem[],
  basePath: string,
  puedeAtenderTickets: boolean | undefined,
): NavItem[] {
  if (!puedeAtenderTickets) return items;

  return [
    ...items,
    {
      icon: 'support_agent',
      label: 'Tickets asignados',
      path: `${basePath}/tecnico/tickets`,
      section: 'Soporte Técnico',
    },
  ];
}
