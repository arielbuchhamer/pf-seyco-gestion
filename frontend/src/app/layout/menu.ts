import { PANELES } from '../core/models/acceso.model';

export type IconoMenu = 'inicio' | 'usuarios' | 'roles' | 'proyectos' | 'portafolio' | 'cobranzas' | 'avisos';

export interface MenuItem {
  label: string;
  path: string;
  panel: string;
  // Texto de la tarjeta en el menú principal.
  descripcion: string;
  // Color del ícono en la tarjeta (el fondo es el mismo color, suave).
  color: string;
  icon: IconoMenu;
}

export interface MenuSeccion {
  titulo: string;
  descripcion: string;
  items: MenuItem[];
}

// Una sola definición para la barra lateral y el menú principal (pages/dashboard).
// Patrón a repetir: cada opción declara qué panel la habilita; debe ser el mismo panel que el
// panelGuard de su ruta. Qué roles ven cada panel se configura en la base (roles_paneles) desde
// la pantalla Roles. "Gestión global" (Portafolio, Cobranzas y Avisos) usa el panel de proyectos.
// Las tareas no tienen opción propia: viven dentro de cada proyecto (solapa Tareas).
export const MENU: MenuSeccion[] = [
  {
    titulo: 'Gestión global',
    descripcion: 'El estado de todas las obras en un solo lugar.',
    items: [
      {
        label: 'Portafolio',
        path: '/portafolio',
        panel: PANELES.proyectos,
        descripcion: 'Avance, gastos y cobros de todas las obras.',
        color: '#0f5fa6',
        icon: 'portafolio',
      },
      {
        label: 'Cobranzas',
        path: '/cobranzas',
        panel: PANELES.proyectos,
        descripcion: 'Lo que falta certificar y cobrar en todas las obras.',
        color: '#1f9d55',
        icon: 'cobranzas',
      },
      {
        label: 'Avisos',
        path: '/avisos',
        panel: PANELES.proyectos,
        descripcion: 'Lo que hay que revisar en todas las obras.',
        color: '#c43c33',
        icon: 'avisos',
      },
    ],
  },
  {
    titulo: 'Gestión de proyectos',
    descripcion: 'Cada obra con sus tareas, presupuesto, costos y certificaciones.',
    items: [
      {
        label: 'Proyectos',
        path: '/proyectos',
        panel: PANELES.proyectos,
        descripcion: 'Importá obras y seguí tareas, costos y certificaciones.',
        color: '#c8790f',
        icon: 'proyectos',
      },
    ],
  },
  {
    titulo: 'Gestión de usuarios',
    descripcion: 'Quién entra al sistema y qué puede ver o hacer.',
    items: [
      {
        label: 'Usuarios',
        path: '/usuarios',
        panel: PANELES.usuarios,
        descripcion: 'Altas, bajas y datos de las personas que usan el sistema.',
        color: '#1f9d55',
        icon: 'usuarios',
      },
      {
        label: 'Roles',
        path: '/roles',
        panel: PANELES.roles,
        descripcion: 'Permisos de cada rol sobre módulos y pantallas.',
        color: '#6d4bb8',
        icon: 'roles',
      },
    ],
  },
];

// Secciones con sólo las opciones que el usuario puede ver (las vacías se ocultan).
export function menuVisible(puedeVerPanel: (panel: string) => boolean): MenuSeccion[] {
  return MENU.map((s) => ({ ...s, items: s.items.filter((i) => puedeVerPanel(i.panel)) })).filter(
    (s) => s.items.length > 0,
  );
}
