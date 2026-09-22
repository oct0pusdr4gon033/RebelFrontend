
import type { 
  LoginRequest, 
  LoginResult, 
  SessionAttemptStatus, 
  ResolveSessionAttemptRequest 
} from "../Dtos/Login";

import { API_BASE } from '../../env/envoviment';

export async function loginApi(request: LoginRequest): Promise<LoginResult> {
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

export async function checkSessionAttemptApi(attemptId: string): Promise<SessionAttemptStatus> {
    const response = await fetch(`${API_BASE}/api/auth/check-session-attempt/${attemptId}`);
    if (!response.ok) {
        const err = await response.json().catch(() => ({ mensaje: 'Error al verificar sesión' }));
        throw new Error(err.mensaje ?? 'Intento no encontrado o expirado');
    }
    return response.json();
}

export async function resolveSessionAttemptApi(attemptId: string, approved: boolean): Promise<{ success: boolean; approved: boolean }> {
    const body: ResolveSessionAttemptRequest = { attemptId, approved };
    const response = await fetch(`${API_BASE}/api/auth/resolve-session-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ mensaje: 'Error al procesar respuesta' }));
        throw new Error(err.mensaje ?? 'No se pudo resolver el intento');
    }

    return response.json();
}
