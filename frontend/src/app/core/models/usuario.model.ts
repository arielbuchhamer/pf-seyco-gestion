// Único lugar donde se declaran los roles del front: sumar uno nuevo acá (y en el enum Rol
// del back) alcanza para que aparezca en el alta de usuarios y se pueda usar en rolGuard/*tieneRol.
export const ROLES = ['ADMINISTRADOR', 'USUARIO'] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  USUARIO: 'Usuario',
};

// Refleja la entidad Usuario del backend tal cual se serializa
// (el campo clave nunca viaja de vuelta, ver @JsonProperty WRITE_ONLY en el backend).
// nombre/apellido son obligatorios desde el alta, pero pueden venir null en usuarios
// creados antes de que existieran (ver nombreCompleto(), que cae al email).
export interface Usuario {
  id: number;
  email: string;
  nombre: string | null;
  apellido: string | null;
  rol: Rol;
}

export function nombreCompleto(usuario: Pick<Usuario, 'email' | 'nombre' | 'apellido'>): string {
  const nombre = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ');
  return nombre || usuario.email;
}

// Payload para crear/editar. La clave es obligatoria al crear; al editar,
// dejarla vacía significa "no cambiar la contraseña" (el backend lo interpreta así).
export interface UsuarioInput {
  email: string;
  nombre: string;
  apellido: string;
  clave?: string;
  rol: Rol;
}
