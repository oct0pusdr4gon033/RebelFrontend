export const getApiBase = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return 'https://localhost:7010';
    }
    // Para dispositivos en red local (móvil, otra PC), usar HTTP en el puerto 5114
    // Esto evita el bloqueo "Failed to fetch" causado por el certificado SSL de desarrollo no confiable
    return `http://${window.location.hostname}:5114`;
  }
  return 'https://localhost:7010';
};

export const API_BASE = getApiBase();

export class Envoriment {
    development = API_BASE;
    deploy = API_BASE;
}