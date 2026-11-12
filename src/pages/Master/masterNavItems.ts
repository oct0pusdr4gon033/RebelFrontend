import type { NavItem } from '../../components/SideBar/NavItem';

export const masterNavItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', path: '/master', section: null },
    {
        icon: 'monitoring',
        label: 'Supervisión Master',
        path: '/master/supervision',
        section: 'Supervisión de Equipo',
        pushButtons: [
            {
                id: 'sup-resumen',
                tabKey: 'resumen',
                label: 'Resumen y Métricas',
                path: '/master/supervision?tab=resumen',
                description: 'Desempeño y volumen del equipo',
            },
            {
                id: 'sup-oportunidades',
                tabKey: 'oportunidades',
                label: 'Todas las Oportunidades',
                path: '/master/supervision?tab=oportunidades',
                description: 'Todas las licitaciones registradas',
            },
            {
                id: 'sup-ocams',
                tabKey: 'ocams',
                label: 'Todas las OCAMs / OCs',
                path: '/master/supervision?tab=ocams',
                description: 'Todas las órdenes de compra emitidas',
            },
            {
                id: 'sup-contactos',
                tabKey: 'contactos',
                label: 'Agenda Global',
                path: '/master/supervision?tab=contactos',
                description: 'Directorio de contactos del equipo',
            },
            {
                id: 'sup-ranking',
                tabKey: 'ranking',
                label: 'Ranking de Ejecutivas',
                path: '/master/supervision?tab=ranking',
                badge: 'Top',
                description: 'Comparativo individual de ventas',
            },
        ],
    },
    {
        icon: 'bolt',
        label: 'Oportunidades',
        path: '/master/registro-oportunidad',
        section: 'Ventas y Licitaciones',
        pushButtons: [
            {
                id: 'registrar',
                tabKey: 'registrar',
                label: 'Registrar',
                path: '/master/registro-oportunidad?tab=registrar',
            },
            {
                id: 'mis-oportunidades',
                tabKey: 'mis-oportunidades',
                label: 'Mis Oportunidades',
                path: '/master/registro-oportunidad?tab=mis-oportunidades',
            },
            {
                id: 'listar',
                tabKey: 'listar',
                label: 'Listar',
                path: '/master/registro-oportunidad?tab=listar',
            },
            {
                id: 'podio-licitaciones',
                tabKey: 'podio',
                label: 'Podio Licitaciones',
                path: '/master/registro-oportunidad?tab=podio&tipo=licitaciones',
                badge: '1° Reg',
            },
            {
                id: 'podio-ventas',
                tabKey: 'podio',
                label: 'Podio Ventas',
                path: '/master/registro-oportunidad?tab=podio&tipo=ventas',
                badge: 'S/',
            },
        ],
    },
    { icon: 'local_shipping', label: 'Seguimiento OC', path: '/master/seguimiento-oc', section: null },
    { icon: 'payments', label: 'Solicitud de Pagos', path: '/master/pagos', section: null },
    {
        icon: 'import_contacts',
        label: 'Agenda de Contactos',
        path: '/master/agenda-contactos',
        section: null,
        pushButtons: [
            {
                id: 'master-agenda-registrar',
                tabKey: 'registrar',
                label: 'Registrar',
                path: '/master/agenda-contactos?tab=registrar',
                description: 'Nuevo contacto de OCAM',
            },
            {
                id: 'master-agenda-contactos',
                tabKey: 'agenda',
                label: 'Agenda',
                path: '/master/agenda-contactos?tab=agenda',
                description: 'Directorio y filtros por OCAM',
            },
        ],
    },
    { icon: 'assignment', label: 'Mis Solicitudes', path: '/master/solicitudes', section: 'Gestión Interna' },
    { icon: 'confirmation_number', label: 'Tickets', path: '/master/tickets', section: null },
    {
        icon: 'schedule',
        label: 'Asistencias',
        path: '/master/asistencias',
        section: 'Personal',
        pushButtons: [
            {
                id: 'master-mi-asistencia',
                label: 'Mi Asistencia',
                path: '/master/asistencias',
            },
            {
                id: 'master-estadisticas-asistencia',
                label: 'Estadísticas de asistencia',
                path: '/master/estadisticas/asistencia',
            },
            {
                id: 'master-historial-asistencia',
                label: 'Historial de asistencia',
                path: '/master/asistencias/historial',
            },
        ],
    },
    { icon: 'person', label: 'Mi Cuenta', path: '/master/mi-cuenta', section: 'Cuenta' },
];