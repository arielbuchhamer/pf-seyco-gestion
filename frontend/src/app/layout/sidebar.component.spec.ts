import { Component, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PANELES } from '../core/models/acceso.model';
import { AvisoProyecto, RespuestaAvisos } from '../core/models/aviso.model';
import { UsuarioSesion } from '../core/models/usuario.model';
import { AuthService } from '../core/services/auth.service';
import { CLAVE_CONTRAIDA, SidebarComponent } from './sidebar.component';

@Component({ standalone: true, template: '' })
class PaginaVaciaComponent {}

const USUARIO: UsuarioSesion = {
  id: 1,
  email: 'ana@seyco.com',
  nombre: 'Ana',
  apellido: 'Gómez',
  roles: ['admin'],
};

function aviso(
  proyectoId: number,
  nivel: AvisoProyecto['nivel'],
  titulo: string,
  detalle: string | null = null,
  solapa: AvisoProyecto['solapa'] = 'indicadores',
): AvisoProyecto {
  return { proyectoId, proyectoNombre: 'Obra ' + proyectoId, nivel, titulo, detalle, solapa };
}

const AVISOS: RespuestaAvisos = {
  totales: { criticos: 3, advertencias: 1, informativos: 1, proyectosConCriticos: 2 },
  avisos: [
    aviso(1, 'CRITICA', 'Rubro excedido', 'Mano de obra', 'costos'),
    aviso(1, 'CRITICA', 'Saldo sin certificar', null, 'certificaciones'),
    aviso(2, 'CRITICA', 'Atraso de 9 días', null, 'gantt'),
    aviso(2, 'ADVERTENCIA', 'Sin anticipo'),
    aviso(3, 'INFO', 'Línea base sin fijar'),
  ],
};

const SIN_CRITICOS: RespuestaAvisos = {
  totales: { criticos: 0, advertencias: 1, informativos: 0, proyectosConCriticos: 0 },
  avisos: [aviso(2, 'ADVERTENCIA', 'Sin anticipo')],
};

// conPermiso: si el rol tiene proyectos:leer (campanita). Con permiso, el pedido a /api/avisos
// se responde con `avisos`.
function crear(
  paneles: string[],
  conPermiso = true,
  avisos: RespuestaAvisos | null = AVISOS,
  usuario: UsuarioSesion = USUARIO,
): ComponentFixture<SidebarComponent> {
  TestBed.configureTestingModule({
    imports: [SidebarComponent],
    providers: [
      provideRouter([
        { path: 'dashboard', component: PaginaVaciaComponent },
        { path: 'proyectos', component: PaginaVaciaComponent },
        { path: 'proyectos/:id', component: PaginaVaciaComponent },
        { path: 'avisos', component: PaginaVaciaComponent },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: AuthService,
        useValue: {
          currentUser: signal(usuario),
          puedeVerPanel: (p: string) => paneles.includes(p),
          puede: (modulo: string, accion: string) =>
            conPermiso && modulo === 'proyectos' && accion === 'leer',
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(SidebarComponent);
  fixture.detectChanges();
  if (conPermiso && avisos) {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/avisos').flush(avisos);
    fixture.detectChanges();
  }
  return fixture;
}

function el(fixture: ComponentFixture<SidebarComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function q<T extends HTMLElement>(
  fixture: ComponentFixture<SidebarComponent>,
  selector: string,
): T | null {
  return el(fixture).querySelector<T>(selector);
}

function textos(fixture: ComponentFixture<SidebarComponent>): string[] {
  return Array.from(el(fixture).querySelectorAll('.nav .item')).map(
    (i) => i.getAttribute('aria-label') ?? '',
  );
}

describe('SidebarComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Ancho de escritorio: en celular la barra arranca contraída.
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
  });

  describe('estado contraído', () => {
    it('arranca expandida y se guarda al contraer', async () => {
      const fixture = crear([]);
      expect(q(fixture, '.barra--contraida')).toBeNull();

      q(fixture, '.contraer')!.click();
      fixture.detectChanges();

      expect(q(fixture, '.barra--contraida')).not.toBeNull();
      expect(window.localStorage.getItem(CLAVE_CONTRAIDA)).toBe('true');
      expect(q(fixture, '.contraer')!.getAttribute('aria-label')).toBe('Expandir menú');
    });

    it('recupera el estado guardado en la sesión anterior', () => {
      window.localStorage.setItem(CLAVE_CONTRAIDA, 'true');
      const fixture = crear([]);
      expect(q(fixture, '.barra--contraida')).not.toBeNull();
      expect(q(fixture, '.marca__logo')).toBeNull();
      expect(q(fixture, '.marca__emblema')).not.toBeNull();
    });

    it('al expandir de nuevo guarda false', () => {
      window.localStorage.setItem(CLAVE_CONTRAIDA, 'true');
      const fixture = crear([]);
      q(fixture, '.contraer')!.click();
      fixture.detectChanges();
      expect(window.localStorage.getItem(CLAVE_CONTRAIDA)).toBe('false');
      expect(q(fixture, '.barra--contraida')).toBeNull();
    });

    it('en celular arranca contraída aunque no haya nada guardado', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
      const fixture = crear([]);
      expect(q(fixture, '.barra--contraida')).not.toBeNull();
    });
  });

  describe('filtrado por rol', () => {
    it('con todos los paneles muestra todas las opciones y grupos', () => {
      const fixture = crear([PANELES.proyectos, PANELES.usuarios, PANELES.roles]);
      expect(textos(fixture)).toEqual([
        'Menú principal',
        'Portafolio',
        'Cobranzas',
        'Avisos',
        'Proyectos',
        'Usuarios',
        'Roles',
      ]);
      const titulos = Array.from(el(fixture).querySelectorAll('.grupo__titulo')).map((t) =>
        t.textContent?.trim(),
      );
      expect(titulos).toEqual(['Gestión global', 'Gestión de proyectos', 'Gestión de usuarios']);
    });

    it('sin paneles sólo muestra Menú principal, sin títulos ni separadores', () => {
      const fixture = crear([]);
      expect(textos(fixture)).toEqual(['Menú principal']);
      expect(q(fixture, '.grupo__titulo')).toBeNull();
      expect(q(fixture, '.separador')).toBeNull();
    });

    it('oculta el grupo entero si no tiene opciones visibles', () => {
      const fixture = crear([PANELES.usuarios]);
      expect(textos(fixture)).toEqual(['Menú principal', 'Usuarios']);
      const titulos = Array.from(el(fixture).querySelectorAll('.grupo__titulo')).map((t) =>
        t.textContent?.trim(),
      );
      expect(titulos).toEqual(['Gestión de usuarios']);
      expect(el(fixture).querySelectorAll('.separador').length).toBe(1);
    });

    it('no muestra ningún contador en el menú aunque haya avisos críticos', () => {
      const fixture = crear([PANELES.proyectos, PANELES.usuarios, PANELES.roles]);
      expect(q(fixture, '.campana__globito')?.textContent?.trim()).toBe('3');
      expect(el(fixture).querySelectorAll('.nav .item').length).toBe(7);
      expect(el(fixture).querySelector('.nav .item__contador')).toBeNull();
      for (const hijo of Array.from(el(fixture).querySelectorAll('.nav .item > *'))) {
        expect(hijo.className).toMatch(/^item__(icono|texto)$/);
      }
      for (const etiqueta of textos(fixture)) {
        expect(etiqueta).not.toMatch(/\d/);
      }
    });

    it('contraída tampoco muestra contadores ni los menciona en el tooltip', () => {
      window.localStorage.setItem(CLAVE_CONTRAIDA, 'true');
      const fixture = crear([PANELES.proyectos]);
      expect(q(fixture, '.barra--contraida')).not.toBeNull();
      expect(el(fixture).querySelector('.nav .item__contador')).toBeNull();

      const proyectos = Array.from(el(fixture).querySelectorAll<HTMLElement>('.item')).find(
        (i) => i.getAttribute('aria-label') === 'Proyectos',
      )!;
      proyectos.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();
      expect(q(fixture, '.tooltip')?.textContent?.trim()).toBe('Proyectos');
    });

    it('sin permiso de leer proyectos no se piden los datos', () => {
      crear([PANELES.proyectos], false);
      TestBed.inject(HttpTestingController).expectNone('/api/avisos');
    });

    it('marca la opción activa con aria-current="page"', async () => {
      const fixture = crear([PANELES.proyectos]);
      await TestBed.inject(Router).navigateByUrl('/proyectos');
      fixture.detectChanges();
      const activa = q(fixture, '.item--activa');
      expect(activa?.getAttribute('aria-current')).toBe('page');
      expect(activa?.getAttribute('aria-label')).toContain('Proyectos');
    });
  });

  describe('menú de usuario', () => {
    it('se abre con el botón y expone aria-expanded', () => {
      const fixture = crear([]);
      const boton = q(fixture, '.usuario')!;
      expect(boton.getAttribute('aria-haspopup')).toBe('menu');
      expect(boton.getAttribute('aria-expanded')).toBe('false');
      expect(q(fixture, 'app-usuario-menu')).toBeNull();

      boton.click();
      fixture.detectChanges();

      expect(boton.getAttribute('aria-expanded')).toBe('true');
      expect(q(fixture, 'app-usuario-menu')).not.toBeNull();
      expect(el(fixture).querySelectorAll('[role="menuitem"]').length).toBe(3);
    });

    describe('anclaje', () => {
      function caja(left: number, top: number, width: number, height: number): DOMRect {
        return {
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          x: left,
          y: top,
        } as DOMRect;
      }

      function abrirConCajas(
        fixture: ComponentFixture<SidebarComponent>,
        boton: DOMRect,
        fila: DOMRect,
      ): HTMLElement {
        q(fixture, '.usuario')!.getBoundingClientRect = () => boton;
        q(fixture, '.pie__fila')!.getBoundingClientRect = () => fila;
        q(fixture, '.usuario')!.click();
        fixture.detectChanges();
        return q(fixture, 'app-usuario-menu')!;
      }

      beforeEach(() => {
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
      });

      it('expandida: queda encima del bloque, con su mismo ancho y alineada', () => {
        const fixture = crear([]);
        const menu = abrirConCajas(fixture, caja(12, 730, 190, 44), caja(12, 730, 236, 44));

        expect(menu.getAttribute('data-modo')).toBe('arriba');
        expect(menu.style.left).toBe('12px');
        expect(menu.style.width).toBe('236px');
        // 800 - 730 + 8 de separación
        expect(menu.style.bottom).toBe('78px');
      });

      it('contraída: se abre a la derecha del avatar y alineada con él', () => {
        window.localStorage.setItem(CLAVE_CONTRAIDA, 'true');
        const fixture = crear([]);
        const menu = abrirConCajas(fixture, caja(14, 700, 44, 44), caja(12, 640, 48, 104));

        expect(menu.getAttribute('data-modo')).toBe('lado');
        expect(menu.style.left).toBe('66px');
        expect(menu.style.bottom).toBe('56px');
      });

      it('si no entra arriba se achica en vez de salirse de la pantalla', () => {
        const fixture = crear([]);
        const menu = abrirConCajas(fixture, caja(12, 100, 190, 44), caja(12, 100, 236, 44));

        // 100 de arriba - 8 de separación - 8 de margen
        expect(menu.style.maxHeight).toBe('84px');
      });

      it('en celular contraída no se pasa del ancho de la pantalla', () => {
        Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true });
        const fixture = crear([]);
        const menu = abrirConCajas(fixture, caja(14, 700, 44, 44), caja(12, 640, 48, 104));

        // 320 - 66 de left - 8 de margen
        expect(menu.style.width).toBe('246px');
      });

      it('al contraer o expandir la barra con el menú abierto, se cierra', () => {
        const fixture = crear([]);
        q(fixture, '.usuario')!.click();
        fixture.detectChanges();

        q(fixture, '.contraer')!.click();
        fixture.detectChanges();

        expect(q(fixture, 'app-usuario-menu')).toBeNull();
      });
    });

    it('se cierra con Esc y devuelve el foco al botón', () => {
      const fixture = crear([]);
      const boton = q<HTMLButtonElement>(fixture, '.usuario')!;
      boton.click();
      fixture.detectChanges();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(q(fixture, 'app-usuario-menu')).toBeNull();
      expect(document.activeElement).toBe(boton);
    });

    it('se cierra con un clic afuera', () => {
      const fixture = crear([]);
      q(fixture, '.usuario')!.click();
      fixture.detectChanges();

      document.body.click();
      fixture.detectChanges();

      expect(q(fixture, 'app-usuario-menu')).toBeNull();
    });

    it('se cierra al navegar', async () => {
      const fixture = crear([]);
      q(fixture, '.usuario')!.click();
      fixture.detectChanges();

      await TestBed.inject(Router).navigateByUrl('/dashboard');
      fixture.detectChanges();

      expect(q(fixture, 'app-usuario-menu')).toBeNull();
    });

    it('al elegir una opción avisa, se cierra y devuelve el foco', () => {
      const fixture = crear([]);
      let eligio = 0;
      fixture.componentInstance.perfil.subscribe(() => eligio++);
      const boton = q<HTMLButtonElement>(fixture, '.usuario')!;
      boton.click();
      fixture.detectChanges();

      el(fixture).querySelector<HTMLElement>('[role="menuitem"]')!.click();
      fixture.detectChanges();

      expect(eligio).toBe(1);
      expect(q(fixture, 'app-usuario-menu')).toBeNull();
      expect(document.activeElement).toBe(boton);
    });
  });

  describe('campanita y panel de avisos', () => {
    function abrirPanel(fixture: ComponentFixture<SidebarComponent>): void {
      q(fixture, '.campana')!.click();
      fixture.detectChanges();
    }

    it('sin permiso de leer proyectos no hay campanita ni panel', () => {
      const fixture = crear([], false);
      expect(q(fixture, '.campana')).toBeNull();
      expect(q(fixture, 'app-avisos-panel')).toBeNull();
    });

    it('muestra el total de avisos críticos en el globito', () => {
      const fixture = crear([]);
      const campana = q(fixture, '.campana')!;
      expect(q(fixture, '.campana__globito')?.textContent?.trim()).toBe('3');
      expect(campana.getAttribute('aria-label')).toBe('Avisos, 3 avisos nuevos');
      expect(campana.getAttribute('aria-haspopup')).toBe('dialog');
      expect(campana.getAttribute('aria-expanded')).toBe('false');
    });

    it('sin avisos críticos no muestra el globito', () => {
      const fixture = crear([], true, SIN_CRITICOS);
      expect(q(fixture, '.campana__globito')).toBeNull();
      expect(q(fixture, '.campana')!.getAttribute('aria-label')).toBe('Avisos, sin avisos nuevos');
    });

    it('el panel resume un renglón por obra: aviso principal, nivel en texto y contadores', () => {
      const fixture = crear([]);
      abrirPanel(fixture);

      const panel = q(fixture, 'app-avisos-panel')!;
      expect(panel.textContent).toContain('3 para revisar · 1 de atención');
      const filas = panel.querySelectorAll('.aviso');
      expect(filas.length).toBe(3);
      expect(filas[0].textContent).toContain('Obra 1');
      expect(filas[0].textContent).toContain('Para revisar');
      expect(filas[0].textContent).toContain('Rubro excedido');
      expect(filas[0].textContent).toContain('2 para revisar');
      expect(filas[1].textContent).toContain('Obra 2');
      expect(filas[1].textContent).toContain('Atraso de 9 días');
      expect(filas[1].textContent).toContain('1 para revisar');
      expect(filas[1].textContent).toContain('1 de atención');
      expect(filas[2].textContent).toContain('Informativo');
      expect(filas[2].textContent).toContain('Línea base sin fijar');
      expect(filas[0].querySelector('svg')).not.toBeNull();
    });

    it('a igual nivel, el aviso principal de la obra es el más reciente', () => {
      const fixture = crear([], true, {
        totales: { criticos: 2, advertencias: 0, informativos: 0, proyectosConCriticos: 1 },
        avisos: [
          { ...aviso(1, 'CRITICA', 'Viejo'), fecha: '2026-01-10' },
          { ...aviso(1, 'CRITICA', 'Reciente'), fecha: '2026-03-02' },
        ],
      });
      abrirPanel(fixture);
      const fila = q(fixture, 'app-avisos-panel .aviso')!;
      expect(fila.textContent).toContain('Reciente');
      expect(fila.textContent).not.toContain('Viejo');
    });

    it('muestra hasta 6 obras, cuántas quedan y el enlace a todos', () => {
      const muchos = Array.from({ length: 12 }, (_, i) => aviso(i, 'CRITICA', 'Aviso ' + i));
      const fixture = crear([], true, {
        totales: { criticos: 12, advertencias: 0, informativos: 0, proyectosConCriticos: 12 },
        avisos: muchos,
      });
      abrirPanel(fixture);

      expect(el(fixture).querySelectorAll('app-avisos-panel .aviso').length).toBe(6);
      expect(q(fixture, 'app-avisos-panel .mas')!.textContent).toContain('y 6 obras más');
      const enlace = q<HTMLAnchorElement>(fixture, '.panel__pie a')!;
      expect(enlace.textContent).toContain('Ver todos los avisos');
      expect(enlace.getAttribute('href')).toBe('/avisos');
    });

    it('sin avisos muestra el estado vacío', () => {
      const fixture = crear([], true, {
        totales: { criticos: 0, advertencias: 0, informativos: 0, proyectosConCriticos: 0 },
        avisos: [],
      });
      abrirPanel(fixture);
      expect(q(fixture, 'app-avisos-panel')!.textContent).toContain('No hay avisos para revisar');
    });

    it('mientras carga muestra el estado de carga', () => {
      const fixture = crear([], true, null);
      abrirPanel(fixture);
      expect(q(fixture, 'app-avisos-panel')!.textContent).toContain('Cargando avisos');
    });

    it('si falla la carga muestra el error y permite reintentar', () => {
      const fixture = crear([], true, null);
      const http = TestBed.inject(HttpTestingController);
      http.expectOne('/api/avisos').flush('error', { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      abrirPanel(fixture);

      const panel = q(fixture, 'app-avisos-panel')!;
      expect(panel.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudieron cargar los avisos',
      );

      panel.querySelector<HTMLButtonElement>('.reintentar')!.click();
      http.expectOne('/api/avisos').flush(AVISOS);
      fixture.detectChanges();
      expect(panel.querySelectorAll('.aviso').length).toBe(3);
    });

    it('cada obra lleva a la solapa de su aviso principal', async () => {
      const fixture = crear([]);
      abrirPanel(fixture);

      const enlaces = el(fixture).querySelectorAll<HTMLAnchorElement>('app-avisos-panel a.aviso');
      expect(enlaces[0].getAttribute('href')).toBe('/proyectos/1?solapa=costos');
      expect(enlaces[2].getAttribute('href')).toBe('/proyectos/3?solapa=indicadores');

      enlaces[1].click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).toBe('/proyectos/2?solapa=gantt');
      expect(q(fixture, 'app-avisos-panel')).toBeNull();
    });

    it('un clic sobre el texto del aviso navega y cierra el panel', async () => {
      const fixture = crear([]);
      abrirPanel(fixture);

      el(fixture).querySelectorAll<HTMLElement>('app-avisos-panel a.aviso strong')[1].click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).toBe('/proyectos/2?solapa=gantt');
      expect(q(fixture, 'app-avisos-panel')).toBeNull();
    });

    it('el aviso es un enlace accesible por teclado', () => {
      const fixture = crear([]);
      abrirPanel(fixture);

      const enlace = q<HTMLAnchorElement>(fixture, 'app-avisos-panel a.aviso')!;
      expect(enlace.tagName).toBe('A');
      expect(enlace.getAttribute('href')).not.toBeNull();
      expect(enlace.tabIndex).toBe(0);
    });

    it('si el aviso lleva a la ruta en la que ya se está, igual cierra el panel', async () => {
      const fixture = crear([]);
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/proyectos/2?solapa=gantt');
      abrirPanel(fixture);

      el(fixture).querySelectorAll<HTMLAnchorElement>('app-avisos-panel a.aviso')[1].click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(router.url).toBe('/proyectos/2?solapa=gantt');
      expect(q(fixture, 'app-avisos-panel')).toBeNull();
    });

    describe('globito de avisos nuevos', () => {
      it('baja a cero al abrir el panel y el aria-label lo refleja', () => {
        const fixture = crear([]);
        expect(q(fixture, '.campana__globito')?.textContent?.trim()).toBe('3');

        abrirPanel(fixture);

        expect(q(fixture, '.campana__globito')).toBeNull();
        expect(q(fixture, '.campana')!.getAttribute('aria-label')).toBe('Avisos, sin avisos nuevos');
      });

      it('usa singular con un solo aviso nuevo', () => {
        const fixture = crear([], true, {
          totales: { criticos: 1, advertencias: 0, informativos: 0, proyectosConCriticos: 1 },
          avisos: [aviso(1, 'CRITICA', 'Rubro excedido')],
        });
        expect(q(fixture, '.campana')!.getAttribute('aria-label')).toBe('Avisos, 1 aviso nuevo');
      });

      it('rotula "Nuevo" las obras con avisos nuevos al abrir y lo quita al cerrar', () => {
        const fixture = crear([]);
        abrirPanel(fixture);

        const filas = el(fixture).querySelectorAll('app-avisos-panel .aviso');
        expect(filas[0].textContent).toContain('Nuevo');
        expect(filas[1].textContent).toContain('Nuevo');
        expect(filas[2].textContent).not.toContain('Nuevo');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();
        abrirPanel(fixture);

        expect(q(fixture, 'app-avisos-panel')!.textContent).not.toContain('Nuevo');
      });

      it('al volver a abrir el panel ya no hay avisos "Nuevo" ni globito', () => {
        const fixture = crear([]);
        abrirPanel(fixture);
        document.body.click();
        fixture.detectChanges();
        abrirPanel(fixture);

        expect(q(fixture, 'app-avisos-panel')!.textContent).not.toContain('Nuevo');
        expect(q(fixture, '.campana__globito')).toBeNull();
      });
    });

    it('el enlace "Ver todos los avisos" lleva a /avisos', async () => {
      const fixture = crear([]);
      abrirPanel(fixture);

      q<HTMLAnchorElement>(fixture, '.panel__pie a')!.click();
      await fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/avisos');
    });

    it('se cierra con Esc devolviendo el foco a la campanita', () => {
      const fixture = crear([]);
      const campana = q<HTMLButtonElement>(fixture, '.campana')!;
      campana.click();
      fixture.detectChanges();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(q(fixture, 'app-avisos-panel')).toBeNull();
      expect(document.activeElement).toBe(campana);
    });

    it('se cierra con un clic afuera y al navegar', async () => {
      const fixture = crear([]);
      abrirPanel(fixture);
      document.body.click();
      fixture.detectChanges();
      expect(q(fixture, 'app-avisos-panel')).toBeNull();

      abrirPanel(fixture);
      await TestBed.inject(Router).navigateByUrl('/dashboard');
      fixture.detectChanges();
      expect(q(fixture, 'app-avisos-panel')).toBeNull();
    });

    it('abrir uno cierra el otro', () => {
      const fixture = crear([]);
      q(fixture, '.usuario')!.click();
      fixture.detectChanges();
      abrirPanel(fixture);

      expect(q(fixture, 'app-usuario-menu')).toBeNull();
      expect(q(fixture, 'app-avisos-panel')).not.toBeNull();
    });
  });
});
