// Refleja la entidad Usuario del backend tal cual se serializa (tabla `usuarios`; la
// contraseña nunca viaja de vuelta, ver @JsonProperty WRITE_ONLY en el backend).
// Los roles no son un campo del usuario: vienen aparte (UsuarioListado / UsuarioSesion).
// nombre/apellido son obligatorios desde el alta, pero pueden venir null en usuarios
// creados antes de que existieran (ver nombreCompleto(), que cae al email).
export interface Usuario {
  id: number;
  email: string;
  nombre: string | null;
  apellido: string | null;
  dni?: number | null;
  telefono?: string | null;
  fechaAlta?: string | null;
  fechaBaja?: string | null;
}

export interface RolResumen {
  id: number;
  nombre: string;
}

// Fila de GET /api/usuarios: datos + roles (roles_usuarios) + cantidad de sesiones.
export interface UsuarioListado extends Usuario {
  roles: RolResumen[];
  cantidadSesiones: number;
}

// Usuario logueado (login y /api/auth/me): roles por nombre, en minúsculas.
export interface UsuarioSesion extends Usuario {
  roles: string[];
}

export function nombreCompleto(usuario: Pick<Usuario, 'email' | 'nombre' | 'apellido'>): string {
  const nombre = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ');
  return nombre || usuario.email;
}

// Payload para crear/editar. La contraseña es obligatoria al crear; al editar,
// omitirla significa "no cambiarla" (el backend lo interpreta así).
// El rol se asigna aparte, con /api/roles/{id}/usuarios (ver RolService).
export interface UsuarioInput {
  email: string;
  nombre: string;
  apellido: string;
  dni: number | null;
  telefono: string | null;
  contrasena?: string;
}

// Payload de PUT /api/perfil: el usuario logueado sólo edita sus datos personales
// (el email identifica la sesión; contraseña y roles no se tocan desde el perfil).
// El DNI va como texto (null si está vacío): el backend lo valida y lo convierte a número.
export interface PerfilInput {
  nombre: string;
  apellido: string;
  dni: string | null;
  telefono: string | null;
}
