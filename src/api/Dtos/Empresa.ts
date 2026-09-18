

/* ── Catálogo de Empresas (Opcionales para Registro Exprés) ── */
export interface EmpresaOption {
    id: number;
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
}

export interface PaginatedEmpresas {
    items: EmpresaOption[];
    totalCount: number;
}
