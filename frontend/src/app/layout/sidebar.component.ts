import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { UsuarioSesion, iniciales, nombreCompleto } from '../core/models/usuario.model';
import { AuthService } from '../core/services/auth.service';
import { AvisosService } from '../core/services/avisos.service';
import { AvisosPanelComponent } from './avisos-panel.component';
import { IconoMenuComponent } from './icono-menu.component';
import { IconoMenu, menuVisible } from './menu';
import { AnclaMenu, UsuarioMenuComponent } from './usuario-menu.component';

export const CLAVE_CONTRAIDA = 'sidebar_contraida';
const ANCHO_EXPANDIDA = 260;
const ANCHO_CONTRAIDA = 72;
const ANCHO_CELULAR = 768;
const ANCHO_TARJETA = 276;
const SEPARACION_TARJETA = 8;
const MARGEN_PANTALLA = 8;

interface ItemNav {
  label: string;
  path: string;
  icono: IconoMenu;
}

interface GrupoNav {
  titulo: string | null;
  items: ItemNav[];
}

interface TooltipNav {
  texto: string;
  top: number;
}

function leerContraida(): boolean {
  // En celular arranca contraída para no tapar el contenido, sin pisar lo elegido en escritorio.
  if (window.innerWidth < ANCHO_CELULAR) return true;
  try {
    return localStorage.getItem(CLAVE_CONTRAIDA) === 'true';
  } catch {
    return false;
  }
}

// Barra lateral fija con las opciones del menú (layout/menu.ts, filtradas por los paneles del rol),
// el usuario y los avisos. Puede estar contraída (sólo íconos); ese estado se guarda en localStorage.
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IconoMenuComponent,
    UsuarioMenuComponent,
    AvisosPanelComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  host: { '[style.--ancho-barra]': 'ancho() + "px"', '[class.sidebar--contraida]': 'contraida()' },
})
export class SidebarComponent {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly avisosSvc = inject(AvisosService);

  readonly perfil = output<void>();
  readonly faqs = output<void>();
  readonly cerrarSesion = output<void>();

  private readonly botonUsuario = viewChild<ElementRef<HTMLElement>>('botonUsuario');
  private readonly botonAvisos = viewChild<ElementRef<HTMLElement>>('botonAvisos');
  private readonly filaPie = viewChild<ElementRef<HTMLElement>>('filaPie');

  protected readonly contraida = signal(leerContraida());
  protected readonly ancho = computed(() => (this.contraida() ? ANCHO_CONTRAIDA : ANCHO_EXPANDIDA));
  protected readonly menuAbierto = signal(false);
  protected readonly avisosAbierto = signal(false);
  protected readonly tooltip = signal<TooltipNav | null>(null);
  protected readonly anclaMenu = signal<AnclaMenu>({
    modo: 'arriba',
    left: 0,
    bottom: 0,
    ancho: ANCHO_TARJETA,
    maxAlto: 0,
    flecha: 0,
  });

  protected readonly usuario = this.auth.currentUser;
  protected readonly avisosNuevos = this.avisosSvc.criticosNuevos;
  protected readonly puedeVerAvisos = this.avisosSvc.puedeVer;

  // "Menú principal" no está en MENU (lo ven todos los roles); el resto se filtra por panel.
  protected readonly grupos = computed<GrupoNav[]>(() => [
    { titulo: null, items: [{ label: 'Menú principal', path: '/dashboard', icono: 'inicio' }] },
    ...menuVisible((panel) => this.auth.puedeVerPanel(panel)).map((s) => ({
      titulo: s.titulo,
      items: s.items.map((i) => ({ label: i.label, path: i.path, icono: i.icon })),
    })),
  ]);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.cerrarPopups(this.foco() === 'popup'));
  }

  protected nombre(u: UsuarioSesion): string {
    return nombreCompleto(u);
  }

  protected iniciales(u: UsuarioSesion): string {
    return iniciales(u);
  }

  protected rol(u: UsuarioSesion): string {
    const roles = u.roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1));
    return roles.length ? roles.join(', ') : 'Sin rol';
  }

  protected etiquetaAvisos(): string {
    const n = this.avisosNuevos();
    return n ? `Avisos, ${n} ${n === 1 ? 'aviso nuevo' : 'avisos nuevos'}` : 'Avisos, sin avisos nuevos';
  }

  protected alternarContraida(): void {
    const nueva = !this.contraida();
    // El ancho de la barra cambia con una transición: la tarjeta quedaría mal anclada.
    this.cerrarPopups(false);
    this.contraida.set(nueva);
    this.tooltip.set(null);
    try {
      localStorage.setItem(CLAVE_CONTRAIDA, String(nueva));
    } catch {
      // Sin localStorage el estado dura hasta recargar la página.
    }
  }

  protected alternarMenu(): void {
    this.avisosAbierto.set(false);
    if (!this.menuAbierto()) this.anclarMenu();
    this.menuAbierto.update((a) => !a);
  }

  // Calcula dónde poner la tarjeta a partir de la posición real del bloque del usuario. Si no
  // entra, se achica (max-height) y la tarjeta hace scroll en vez de salirse de la pantalla.
  private anclarMenu(): void {
    const boton = this.botonUsuario()?.nativeElement.getBoundingClientRect();
    const fila = this.filaPie()?.nativeElement.getBoundingClientRect();
    if (!boton || !fila) return;
    const alto = window.innerHeight;
    const ancho = window.innerWidth;

    if (this.contraida()) {
      const left = boton.right + SEPARACION_TARJETA;
      this.anclaMenu.set({
        modo: 'lado',
        left,
        bottom: alto - boton.bottom,
        ancho: Math.max(0, Math.min(ANCHO_TARJETA, ancho - left - MARGEN_PANTALLA)),
        maxAlto: Math.max(0, boton.bottom - MARGEN_PANTALLA),
        flecha: boton.height / 2,
      });
      return;
    }

    const centro = boton.left + boton.width / 2 - fila.left;
    this.anclaMenu.set({
      modo: 'arriba',
      left: fila.left,
      bottom: alto - boton.top + SEPARACION_TARJETA,
      ancho: fila.width,
      maxAlto: Math.max(0, boton.top - SEPARACION_TARJETA - MARGEN_PANTALLA),
      flecha: Math.min(Math.max(centro, 24), Math.max(24, fila.width - 24)),
    });
  }

  protected alternarAvisos(): void {
    this.menuAbierto.set(false);
    this.avisosAbierto.update((a) => !a);
  }

  // Cierra el menú y devuelve el foco al botón de usuario antes de avisar al shell (que puede
  // abrir un diálogo y llevarse el foco).
  protected elegir(accion: 'perfil' | 'faqs' | 'cerrarSesion'): void {
    this.cerrarPopups(true);
    this[accion].emit();
  }

  protected mostrarTooltip(item: ItemNav, evento: Event): void {
    if (!this.contraida()) return;
    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltip.set({
      texto: item.label,
      top: caja.top + caja.height / 2,
    });
  }

  protected ocultarTooltip(): void {
    this.tooltip.set(null);
  }

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (this.menuAbierto() || this.avisosAbierto()) this.cerrarPopups(true);
  }

  @HostListener('window:resize')
  protected redimensionar(): void {
    if (this.menuAbierto()) this.anclarMenu();
  }

  @HostListener('document:click', ['$event'])
  protected clicAfuera(evento: MouseEvent): void {
    if (!this.elemento.nativeElement.contains(evento.target as Node)) this.cerrarPopups(false);
  }

  protected cerrarAvisos(): void {
    this.cerrarPopups(true);
  }

  private cerrarPopups(devolverFoco: boolean): void {
    const boton = this.menuAbierto()
      ? this.botonUsuario()
      : this.avisosAbierto()
        ? this.botonAvisos()
        : null;
    this.menuAbierto.set(false);
    this.avisosAbierto.set(false);
    if (devolverFoco) boton?.nativeElement.focus();
  }

  // Dónde está el foco: dentro de un popup (hay que devolverlo al botón al cerrar) u otro lado.
  private foco(): 'popup' | 'otro' {
    const activo = document.activeElement;
    const popup = this.elemento.nativeElement.querySelector('app-usuario-menu, app-avisos-panel');
    return popup && activo && popup.contains(activo) ? 'popup' : 'otro';
  }
}
