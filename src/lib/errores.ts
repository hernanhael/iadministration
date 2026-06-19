// Traduce errores de PostgREST/Postgres a mensajes en español para la UI.

interface ErrorLike {
  code?: string;
  message?: string;
}

interface Contexto {
  duplicado?: string; // 23505 unique_violation
  relacion?: string; // 23503 foreign_key_violation
}

export function mensajeError(error: ErrorLike | null, contexto: Contexto = {}): string {
  if (!error) return 'Ocurrió un error inesperado.';
  switch (error.code) {
    case '23505':
      return contexto.duplicado ?? 'Ya existe un registro con esos datos.';
    case '23503':
      return contexto.relacion ?? 'No se puede completar: hay registros relacionados.';
    case '23514':
      return 'Hay un valor inválido en el formulario.';
    case 'PGRST301':
    case '401':
      return 'Tu sesión expiró. Volvé a iniciar sesión.';
    default:
      return error.message ?? 'Ocurrió un error inesperado.';
  }
}
