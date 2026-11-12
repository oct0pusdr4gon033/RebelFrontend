import type { NavItem } from '../../components/SideBar/NavItem';



export const ejecutivaNavItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', path: '/ejecutiva', section: null },
    {
        icon: 'bolt',
        label: 'Oportunidades',
        path: '/ejecutiva/registro-oportunidad',
        section: 'Ventas y Licitaciones',
        pushButtons: [
            {
                id: 'registrar',
                tabKey: 'registrar',
                label: 'Registrar',
                path: '/ejecutiva/registro-oportunidad?tab=registrar',
            },
            {
                id: 'mis-oportunidades',
                tabKey: 'mis-oportunidades',
                label: 'Mis Oportunidades',
                path: '/ejecutiva/registro-oportunidad?tab=mis-oportunidades',
            },
            {
                id: 'listar',
                tabKey: 'listar',
                label: 'Listar',
                path: '/ejecutiva/registro-oportunidad?tab=listar',
            },
            {
                id: 'podio-licitaciones',
                tabKey: 'podio',
                label: 'Podio Licitaciones',
                path: '/ejecutiva/registro-oportunidad?tab=podio&tipo=licitaciones',
                badge: '1° Reg',
            },
            {
                id: 'podio-ventas',
                tabKey: 'podio',
                label: 'Podio Ventas',
                path: '/ejecutiva/registro-oportunidad?tab=podio&tipo=ventas',
                badge: 'S/',
            },
        ],
    },
    { icon: 'local_shipping', label: 'Seguimiento OC', path: '/ejecutiva/seguimiento-oc', section: null },
    { icon: 'payments', label: 'Solicitud de Pagos', path: '/ejecutiva/pagos', section: null },
    {
        icon: 'import_contacts',
        label: 'Agenda de Contactos',
        path: '/ejecutiva/agenda-contactos',
        section: null,
        pushButtons: [
            {
                id: 'ejec-agenda-registrar',
                tabKey: 'registrar',
                label: 'Registrar',
                path: '/ejecutiva/agenda-contactos?tab=registrar',
                description: 'Nuevo contacto de OCAM',
            },
            {
                id: 'ejec-agenda-contactos',
                tabKey: 'agenda',
                label: 'Agenda',
                path: '/ejecutiva/agenda-contactos?tab=agenda',
                description: 'Directorio y filtros por OCAM',
            },
        ],
    },
    { icon: 'assignment', label: 'Mis Solicitudes', path: '/ejecutiva/solicitudes', section: 'Gestión Interna' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/ejecutiva/tickets', section: null },
    {
        icon: 'schedule',
        label: 'Asistencias',
        path: '/ejecutiva/asistencias',
        section: 'Personal',
        pushButtons: [
            {
                id: 'ejecutiva-mi-asistencia',
                label: 'Mi Asistencia',
                path: '/ejecutiva/asistencias',
            },
            {
                id: 'ejecutiva-estadisticas-asistencia',
                label: 'Estadísticas de asistencia',
                path: '/ejecutiva/estadisticas/asistencia',
            },
            {
                id: 'ejecutiva-historial-asistencia',
                label: 'Historial de asistencia',
                path: '/ejecutiva/asistencias/historial',
            },
        ],
    },
    { icon: 'person', label: 'Mi Cuenta', path: '/ejecutiva/mi-cuenta', section: 'Cuenta' },
];