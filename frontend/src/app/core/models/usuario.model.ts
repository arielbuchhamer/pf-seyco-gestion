export type Rol = 'ADMINISTRADOR' | 'USUARIO';

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
