export const ROLES = { ESTUDIANTE: 'ESTUDIANTE', DOCENTE: 'DOCENTE' };

export function getSessionRoute(usuario) {
  if (!usuario) return 'Login';
  if (usuario.rol === ROLES.ESTUDIANTE) return 'Fisica';
  if (usuario.rol === ROLES.DOCENTE) return 'Docente';
  return 'SinAcceso';
}
