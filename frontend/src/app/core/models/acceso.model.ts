import { UsuarioSesion } from './usuario.model';

// Gestión de accesos: los permisos vienen de la base (roles_modulos y roles_paneles).
//   leer -> consultar   escribir -> dar de alta   editar -> modificar y dar de baja
export type Accion = 'leer' | 'escribir' | 'editar';
export const ACCIONES: Accion[] = ['leer', 'escribir', 'editar'];

export type PermisoModulo = Record<Accion, boolean>;

// { paneles: ['paneles-proyectos', ...], modulos: { proyectos: { leer, escribir, editar }, ... } }
// Un usuario con varios roles tiene la unión de los permisos.
export interface Permisos {
  paneles: string[];
  modulos: Record<string, PermisoModulo>;
}

export const SIN_PERMISOS: Permisos = { paneles: [], modulos: {} };

// Pantallas protegidas -> nombre del panel en la tabla `paneles`. Se usan en los panelGuard de
// app.routes.ts y en el menú (layout/shell.component.ts). Una pantalla nueva necesita su panel
// acá y en la base (DataSeeder del backend, o desde la pantalla Roles).
export const PANELES = {
  proyectos: 'paneles-proyectos',
  tareas: 'paneles-tareas',
  usuarios: 'paneles-usuarios',
  roles: 'paneles-roles',
} as const;

// Respuesta del login (con token) y de /api/auth/me (sin token).
export interface RespuestaAuth {
  message?: string;
  token?: string;
  usuario: UsuarioSesion;
  permisos: Permisos;
}

export interface Mensaje {
  message: string;
}

export interface Rol {
  id: number;
  nombre: string;
  // Minutos que dura una sesión de este rol.
  tokenDuracion: number;
}

export interface Modulo {
  id: number;
  nombre: string;
}

export interface Panel {
  id: number;
  nombre: string;
}

export interface RolModulo extends PermisoModulo {
  id: number;
  modulo: Modulo;
}

export interface RolPanel {
  id: number;
  panel: Panel;
}
