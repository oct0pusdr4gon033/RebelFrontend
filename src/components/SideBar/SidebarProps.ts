import type { NavItem } from "./NavItem"

export interface SidebarProps {
    roleName: string;
    roleDisplayName?: string;
    roleIcon?: string;
    accent?: string;
    accentBg?: string;
    accentBorder?: string;
    avatarGrad?: string;
    basePath: string;
    navItems: NavItem[];
    isOpen?: boolean;
    onClose?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}
