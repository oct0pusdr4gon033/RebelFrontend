
import type { LoginRequest, LoginResponse } from "../../api/Dtos/Login";

const API_BASE = 'https://localhost:7010';

export async function loginApi(request: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ mensaje: 'Error de conexión' }));
        throw new Error(err.mensaje ?? 'Credenciales incorrectas');
    }

    return response.json();
}