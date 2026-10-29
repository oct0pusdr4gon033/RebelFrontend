import type { NavPushButton } from './NavPushButton'

export interface NavItem {
    icon: string;
    label: string;
    path?: string;
    section?: string | null;
    badge?: string;
    onClick?: () => void;
    /** Sub-botones a modo de push button integrados en el sidebar */
    pushButtons?: NavPushButton[];
}