import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconoMenuComponent } from '../../layout/icono-menu.component';
import { menuVisible } from '../../layout/menu';
import { CabeceraComponent } from '../../shared/cabecera/cabecera.component';

// Menú principal: las opciones del menú (layout/menu.ts) como tarjetas, una sección (panel) por
// categoría: título y descripción a la izquierda, tarjetas centradas. Mismo armado que las demás
// pantallas (ruta + app-cabecera + .panel). Cada rol ve sólo las opciones que tiene habilitadas.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, IconoMenuComponent, CabeceraComponent],
  template: `
    <section class="page inicio">
      <nav class="breadcrumb" aria-label="Ruta">
        <a routerLink="/dashboard" aria-current="page">Menú principal</a>
      </nav>

      <app-cabecera titulo="Menú principal" [subtitulo]="saludo()" />

      @for (seccion of secciones(); track seccion.titulo) {
        <section class="panel seccion" [attr.aria-label]="seccion.titulo">
          <header class="seccion__cabecera">
            <h2 class="panel__titulo">{{ seccion.titulo }}</h2>
            <p class="panel__subtitulo">{{ seccion.descripcion }}</p>
          </header>
          <div class="tarjetas">
            @for (item of seccion.items; track item.path) {
              <a class="tarjeta" [routerLink]="item.path" [style.--tono]="item.color">
                <span class="tarjeta__icono"><app-icono-menu [icono]="item.icon" [tamano]="20" /></span>
                <span class="tarjeta__textos">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.descripcion }}</small>
                </span>
                <svg class="tarjeta__flecha" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
            }
          </div>
        </section>
      } @empty {
        <div class="panel muted">Tu rol todavía no tiene pantallas habilitadas. Pedile al administrador que revise sus permisos.</div>
      }
    </section>
  `,
  styles: `
    /* Ancho completo y márgenes como el Portafolio. */
    .page.inicio {
      max-width: none;
      padding: 1.25rem clamp(1rem, 3.5vw, 3rem) 2rem;
    }
    .seccion {
      margin-bottom: 1rem;
    }
    .seccion__cabecera {
      padding-bottom: 0.85rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }
    .seccion__cabecera .panel__titulo {
      margin: 0;
      font-size: 1rem;
    }
    .seccion__cabecera .panel__subtitulo {
      margin: 0.15rem 0 0;
    }
    .tarjetas {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
      padding-bottom: 0.25rem;
    }
    .tarjeta {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      width: 21rem;
      padding: 1rem 1.1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: inherit;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    .tarjeta:hover,
    .tarjeta:focus-visible {
      transform: translateY(-2px);
      border-color: var(--color-primary-light);
      box-shadow: 0 10px 24px -14px rgba(31, 45, 90, 0.45);
      outline: none;
    }
    .tarjeta__icono {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 10px;
      color: #fff;
      background: var(--tono);
      box-shadow: 0 4px 10px -4px color-mix(in srgb, var(--tono) 70%, transparent);
    }
    .tarjeta__textos {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .tarjeta__textos strong {
      font-size: 0.95rem;
      color: var(--color-ink);
    }
    .tarjeta__textos small {
      font-size: 0.8rem;
      line-height: 1.4;
      color: var(--color-text-muted);
    }
    .tarjeta__flecha {
      flex-shrink: 0;
      color: var(--color-text-muted);
      transition: transform 0.15s ease, color 0.15s ease;
    }
    .tarjeta:hover .tarjeta__flecha {
      transform: translateX(3px);
      color: var(--color-primary);
    }
    @media (max-width: 640px) {
      .tarjeta {
        width: 100%;
      }
    }
  `,
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);

  protected readonly secciones = computed(() => menuVisible((panel) => this.auth.puedeVerPanel(panel)));

  protected readonly saludo = computed(() => {
    const nombre = this.auth.currentUser()?.nombre;
    return (nombre ? `Hola, ${nombre}. ` : '') + 'Elegí a qué sección querés ir.';
  });
}
