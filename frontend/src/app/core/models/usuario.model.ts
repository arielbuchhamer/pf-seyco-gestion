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
export interface Usuario {
  id: number;
  email: string;
  rol: Rol;
}

// Payload para crear/editar. La clave es obligatoria al crear; al editar,
// dejarla vacía significa "no cambiar la contraseña" (el backend lo interpreta así).
export interface UsuarioInput {
  email: string;
  clave?: string;
  rol: Rol;
}
