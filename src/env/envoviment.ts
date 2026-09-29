export const getApiBase = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    // Usar HTTP en el puerto 5114 también en localhost
    // Esto evita el bloqueo "Failed to fetch" causado por el certificado SSL de desarrollo no confiable
    return `http://${window.location.hostname}:5114`;
  }
  return 'http://localhost:5114';
};

export const API_BASE = getApiBase();

export class Envoriment {
    development = API_BASE;
    deploy = API_BASE;
}