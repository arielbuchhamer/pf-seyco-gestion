import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AvisoProyecto, RespuestaAvisos } from '../../core/models/aviso.model';
import { AuthService } from '../../core/services/auth.service';
import { AvisosPageComponent } from './avisos.component';

function aviso(
  proyectoId: number,
  nivel: AvisoProyecto['nivel'],
  titulo: string,
  detalle: string | null = null,
  solapa: AvisoProyecto['solapa'] = 'indicadores',
): AvisoProyecto {
  return { proyectoId, proyectoNombre: 'Obra ' + proyectoId, nivel, titulo, detalle, solapa };
}

const RESPUESTA: RespuestaAvisos = {
  totales: { criticos: 2, advertencias: 2, informativos: 1, proyectosConCriticos: 2 },
  avisos: [
    aviso(2, 'CRITICA', 'Rubro excedido', 'Mano de obra', 'costos'),
    aviso(3, 'CRITICA', 'Saldo sin certificar'),
    aviso(2, 'ADVERTENCIA', 'Sin anticipo'),
    aviso(3, 'ADVERTENCIA', 'Avance sin certificar'),
    aviso(1, 'INFO', 'Línea base sin fijar'),
  ],
};

describe('AvisosPageComponent', () => {
  let http: HttpTestingController;

  function crear(
    respuesta: RespuestaAvisos | 'error' | null = RESPUESTA,
    permiso = true,
  ): ComponentFixture<AvisosPageComponent> {
    TestBed.configureTestingModule({
      imports: [AvisosPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { puede: () => permiso, currentUser: signal({ id: 1 }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AvisosPageComponent);
    fixture.detectChanges();
    if (permiso && respuesta) {
      const avisos = http.expectOne('/api/avisos');
      if (respuesta === 'error') {
        avisos.flush('x', { status: 500, statusText: 'Error' });
      } else {
        avisos.flush(respuesta);
      }
      fixture.detectChanges();
    }
    return fixture;
  }

  function el(fixture: ComponentFixture<AvisosPageComponent>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function elegir(
    fixture: ComponentFixture<AvisosPageComponent>,
    selector: string,
    valor: string,
  ): void {
    const select = el(fixture).querySelector<HTMLSelectElement>(selector)!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function titulos(fixture: ComponentFixture<AvisosPageComponent>): string[] {
    return Array.from(el(fixture).querySelectorAll('app-avisos .aviso strong')).map(
      (t) => t.textContent?.trim() ?? '',
    );
  }

  it('muestra los totales por nivel arriba', () => {
    const fixture = crear();
    const kpis = Array.from(el(fixture).querySelectorAll('.avisos-page__totales app-kpi')).map(
      (k) => k.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(kpis[0]).toContain('Para revisar');
    expect(kpis[0]).toContain('2');
    expect(kpis[0]).toContain('2 obras afectadas');
    expect(kpis[1]).toContain('De atención');
    expect(kpis[2]).toContain('Informativos');
  });

  it('lista todos los avisos en una sola lista, los críticos primero, con el link a su obra', () => {
    const fixture = crear();
    expect(titulos(fixture)).toEqual([
      'Rubro excedido',
      'Saldo sin certificar',
      'Sin anticipo',
      'Avance sin certificar',
      'Línea base sin fijar',
    ]);
    const enlace = el(fixture).querySelector<HTMLAnchorElement>('app-avisos .aviso__obra')!;
    expect(enlace.textContent?.trim()).toBe('Obra 2');
    expect(enlace.getAttribute('href')).toBe('/proyectos/2?solapa=costos');
  });

  it('el selector de obra lista sólo las obras con avisos, ordenadas, y "Todos los proyectos"', () => {
    const fixture = crear();
    const opciones = Array.from(
      el(fixture).querySelectorAll<HTMLOptionElement>('.filtro-proyecto option'),
    ).map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['Todos los proyectos', 'Obra 1', 'Obra 2', 'Obra 3']);
  });

  it('filtra por obra', () => {
    const fixture = crear();
    elegir(fixture, '.filtro-proyecto', '2');
    expect(titulos(fixture)).toEqual(['Rubro excedido', 'Sin anticipo']);

    elegir(fixture, '.filtro-proyecto', '');
    expect(titulos(fixture).length).toBe(5);
  });

  it('filtra por nivel', () => {
    const fixture = crear();
    elegir(fixture, '.filtro-nivel', 'ADVERTENCIA');
    expect(titulos(fixture)).toEqual(['Sin anticipo', 'Avance sin certificar']);

    elegir(fixture, '.filtro-nivel', 'CRITICA');
    expect(titulos(fixture)).toEqual(['Rubro excedido', 'Saldo sin certificar']);
  });

  it('combina los dos filtros y permite quitarlos', () => {
    const fixture = crear();
    elegir(fixture, '.filtro-proyecto', '3');
    elegir(fixture, '.filtro-nivel', 'CRITICA');
    expect(titulos(fixture)).toEqual(['Saldo sin certificar']);

    el(fixture).querySelector<HTMLButtonElement>('.avisos-page__limpiar')!.click();
    fixture.detectChanges();
    expect(titulos(fixture).length).toBe(5);
    expect(el(fixture).querySelector('.avisos-page__limpiar')).toBeNull();
  });

  it('si ningún aviso coincide lo dice, sin perder los filtros', () => {
    const fixture = crear();
    elegir(fixture, '.filtro-proyecto', '1');
    elegir(fixture, '.filtro-nivel', 'CRITICA');

    expect(el(fixture).querySelector('app-avisos')).toBeNull();
    expect(el(fixture).textContent).toContain('Ningún aviso coincide con los filtros');
    expect(el(fixture).querySelector('.avisos-page__limpiar')).not.toBeNull();
  });

  it('sin avisos muestra "No hay avisos para revisar" y no ofrece filtros', () => {
    const fixture = crear({
      totales: { criticos: 0, advertencias: 0, informativos: 0, proyectosConCriticos: 0 },
      avisos: [],
    });
    expect(el(fixture).textContent).toContain('No hay avisos para revisar');
    expect(el(fixture).querySelector('.avisos-page__filtros')).toBeNull();
  });

  it('mientras carga muestra el estado de carga', () => {
    const fixture = crear(null);
    expect(el(fixture).textContent).toContain('Cargando avisos');
  });

  it('si falla la carga muestra el error con opción de reintentar', () => {
    const fixture = crear('error');
    expect(el(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudieron cargar los avisos',
    );

    el(fixture).querySelector<HTMLButtonElement>('.avisos-page__reintentar')!.click();
    http.expectOne('/api/avisos').flush(RESPUESTA);
    fixture.detectChanges();
    expect(titulos(fixture).length).toBe(5);
  });

  it('sin permiso de leer proyectos lo avisa y no pide datos', () => {
    const fixture = crear(null, false);
    expect(el(fixture).textContent).toContain('No tenés permiso');
    http.expectNone('/api/avisos');
  });
});
