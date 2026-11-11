import type { NavItem } from '../../components/SideBar/NavItem';

export function withTecnicoTicketsNav(
  items: NavItem[],
  basePath: string,
  puedeAtenderTickets: boolean | undefined,
): NavItem[] {
  if (!puedeAtenderTickets) return items;

  const ticketIndex = items.findIndex((it) => it.label.toLowerCase().includes('ticket'));
  const tecnicoItem: NavItem = {
    icon: 'support_agent',
    label: 'Tickets Asignados',
    path: `${basePath}/tecnico/tickets`,
    section: ticketIndex >= 0 ? null : 'Soporte Técnico',
  };

  if (ticketIndex >= 0) {
    const next = [...items];
    next.splice(ticketIndex + 1, 0, tecnicoItem);
    return next;
  }

  const cuentaIndex = items.findIndex((it) => it.label === 'Mi Cuenta');
  if (cuentaIndex >= 0) {
    const next = [...items];
    next.splice(cuentaIndex, 0, tecnicoItem);
    return next;
  }

  return [...items, tecnicoItem];
}
