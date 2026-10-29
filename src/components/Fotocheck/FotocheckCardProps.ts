import type { FotocheckData } from "./FotocheckData";

export interface FotocheckCardProps {
    data: FotocheckData;
    side?: 'front' | 'back';
}
