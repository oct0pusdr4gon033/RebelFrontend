import type { IconName } from "./IconName";


export interface GoogleIconProps extends React.SVGProps<SVGSVGElement> {
    name: IconName;
    size?: number | string;
    color?: string;
    className?: string;
}
