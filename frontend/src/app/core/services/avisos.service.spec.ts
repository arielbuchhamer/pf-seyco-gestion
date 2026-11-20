import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RespuestaAvisos } from '../models/aviso.model';
import { AuthService } from './auth.service';
import {
  AvisosService,
  REFRESCO_AVISOS_MS,
  VIGENCIA_AVISOS_MS,
  claveAviso,
} from './avisos.service';

const RESPUESTA: RespuestaAvisos = {
  totales: { criticos: 2, advertencias: 1, informativos: 0, proyectosConCriticos: 2 },
  avisos: [
    {
      proyectoId: 1,
      proyectoNombre: 'Obra A',
      nivel: 'CRITICA',
      titulo: 'Uno',
      detalle: 'd1',
      solapa: 'costos',
    },
    {
      proyectoId: 2,
      proyectoNombre: 'Obra B',
      nivel: 'CRITICA',
      titulo: 'Dos',
      detalle: null,
      solapa: 'gantt',
    },
    {
      proyectoId: 2,
      proyectoNombre: 'Obra B',
      nivel: 'ADVERTENCIA',
      titulo: 'Tres',
      detalle: null,
      solapa: 'indicadores',
    },
  ],
};

describe('AvisosService', () => {
  let permiso = signal(true);
  let usuario = signal<{ id: number } | null>({ id: 1 });
  let http: HttpTestingController;

  function crear(): AvisosService {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { puede: () => permiso(), currentUser: usuario } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const servicio = TestBed.inject(AvisosService);
    TestBed.tick();
    return servicio;
  }

  function responder(): void {
    http.expectOne('/api/avisos').flush(RESPUESTA);
  }

  beforeEach(() => {
    permiso = signal(true);
    usuario = signal<{ id: number } | null>({ id: 1 });
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carga al iniciar sesión y expone avisos y críticos con un solo pedido', () => {
    const servicio = crear();
    expect(servicio.cargando()).toBe(true);

    responder();

    expect(servicio.cargando()).toBe(false);
    expect(servicio.error()).toBe(false);
    expect(servicio.avisos().length).toBe(3);
    expect(servicio.criticos()).toBe(2);
    http.expectNone('/api/cobranzas');
  });

  it('sin avisos críticos no hay críticos', () => {
    const servicio = crear();
    http.expectOne('/api/avisos').flush({
      totales: { criticos: 0, advertencias: 0, informativos: 0, proyectosConCriticos: 0 },
      avisos: [],
    });
    expect(servicio.criticos()).toBe(0);
  });

  it('sin permiso de leer proyectos no pide nada', () => {
    permiso.set(false);
    const servicio = crear();

    http.expectNone('/api/avisos');
    http.expectNone('/api/cobranzas');
    servicio.recargar(true);
    http.expectNone('/api/avisos');
    expect(servicio.puedeVer()).toBe(false);
    expect(servicio.avisos()).toEqual([]);
  });

  it('si falla /api/avisos marca el error y no deja datos', () => {
    const servicio = crear();
    http.expectOne('/api/avisos').flush('x', { status: 500, statusText: 'Error' });

    expect(servicio.error()).toBe(true);
    expect(servicio.cargando()).toBe(false);
    expect(servicio.avisos()).toEqual([]);
  });

  it('un error al refrescar conserva los últimos datos', () => {
    const servicio = crear();
    responder();

    vi.advanceTimersByTime(REFRESCO_AVISOS_MS);
    http.expectOne('/api/avisos').flush('x', { status: 500, statusText: 'Error' });

    expect(servicio.error()).toBe(true);
    expect(servicio.avisos().length).toBe(3);
  });

  it('refresca cada 5 minutos', () => {
    crear();
    responder();

    vi.advanceTimersByTime(REFRESCO_AVISOS_MS - 1);
    http.expectNone('/api/avisos');

    vi.advanceTimersByTime(1);
    responder();

    vi.advanceTimersByTime(REFRESCO_AVISOS_MS);
    responder();
  });

  it('no encima pedidos: si el anterior sigue en curso, el refresco espera', () => {
    crear();
    const pendiente = http.expectOne('/api/avisos');

    vi.advanceTimersByTime(REFRESCO_AVISOS_MS);
    http.expectNone('/api/avisos');

    pendiente.flush(RESPUESTA);
  });

  it('al cerrar sesión corta el timer, cancela lo pendiente y borra los datos', () => {
    const servicio = crear();
    responder();

    permiso.set(false);
    TestBed.tick();

    expect(servicio.avisos()).toEqual([]);
    expect(servicio.criticos()).toBe(0);
    vi.advanceTimersByTime(REFRESCO_AVISOS_MS * 3);
    http.expectNone('/api/avisos');
  });

  it('al volver a iniciar sesión hay un solo timer (no se acumulan)', () => {
    crear();
    responder();

    permiso.set(false);
    TestBed.tick();
    permiso.set(true);
    TestBed.tick();
    responder();

    vi.advanceTimersByTime(REFRESCO_AVISOS_MS);
    responder();
    http.verify();
  });

  it('cerrar sesión con un pedido en curso lo cancela', () => {
    const servicio = crear();
    const avisos = http.expectOne('/api/avisos');

    permiso.set(false);
    TestBed.tick();

    expect(avisos.cancelled).toBe(true);
    expect(servicio.cargando()).toBe(false);
  });

  describe('recargar (al abrir el panel)', () => {
    it('no vuelve a consultar si los datos son recientes', () => {
      const servicio = crear();
      responder();

      vi.advanceTimersByTime(VIGENCIA_AVISOS_MS - 1);
      servicio.recargar();
      http.expectNone('/api/avisos');
    });

    it('consulta si los datos ya no son recientes', () => {
      const servicio = crear();
      responder();

      vi.advanceTimersByTime(VIGENCIA_AVISOS_MS);
      servicio.recargar();
      responder();
    });

    it('con forzar consulta siempre, salvo que haya un pedido en curso', () => {
      const servicio = crear();
      responder();

      servicio.recargar(true);
      servicio.recargar(true);
      responder();
    });

    it('reintenta enseguida después de un error', () => {
      const servicio = crear();
      http.expectOne('/api/avisos').flush('x', { status: 500, statusText: 'Error' });

      servicio.recargar();
      responder();
      expect(servicio.error()).toBe(false);
    });
  });

  describe('avisos vistos (globito)', () => {
    const CLAVES_CRITICAS = ['1|Uno', '2|Dos'];
    const guardado = (id = 1): string[] | null => {
      const crudo = window.localStorage.getItem('obralia.avisos.vistos.' + id);
      return crudo ? JSON.parse(crudo) : null;
    };

    function conCriticos(...claves: string[]): RespuestaAvisos {
      return {
        totales: {
          criticos: claves.length,
          advertencias: 0,
          informativos: 0,
          proyectosConCriticos: 1,
        },
        avisos: claves.map((clave) => ({
          proyectoId: Number(clave.split('|')[0]),
          proyectoNombre: 'Obra',
          nivel: 'CRITICA' as const,
          titulo: clave.split('|')[1],
          detalle: null,
          solapa: 'indicadores' as const,
        })),
      };
    }

    function refrescar(respuesta: RespuestaAvisos): void {
      vi.advanceTimersByTime(REFRESCO_AVISOS_MS);
      http.expectOne('/api/avisos').flush(respuesta);
    }

    it('la clave de un aviso es obra y título', () => {
      expect(claveAviso({ proyectoId: 7, titulo: 'Sin anticipo' })).toBe('7|Sin anticipo');
    });

    it('cuenta los críticos no vistos y baja a cero al abrir el panel', () => {
      const servicio = crear();
      responder();
      expect(servicio.criticosNuevos()).toBe(2);

      servicio.abrirPanel();

      expect(servicio.criticosNuevos()).toBe(0);
      // El panel y /avisos siguen mostrando todo.
      expect(servicio.avisos().length).toBe(3);
      expect(guardado()).toEqual(CLAVES_CRITICAS);
    });

    it('un aviso crítico nuevo vuelve a subir el globito', () => {
      const servicio = crear();
      responder();
      servicio.abrirPanel();
      servicio.cerrarPanel();

      refrescar(conCriticos('1|Uno', '2|Dos', '3|Tres'));

      expect(servicio.criticosNuevos()).toBe(1);
    });

    it('uno resuelto que vuelve a aparecer se cuenta de nuevo', () => {
      const servicio = crear();
      responder();
      servicio.abrirPanel();
      servicio.cerrarPanel();

      refrescar(conCriticos('2|Dos'));
      expect(servicio.criticosNuevos()).toBe(0);
      refrescar(conCriticos('1|Uno', '2|Dos'));

      expect(servicio.criticosNuevos()).toBe(1);
    });

    it('con el panel abierto lo que llega no cuenta como no visto, pero se rotula nuevo', () => {
      const servicio = crear();
      responder();
      servicio.abrirPanel();

      refrescar(conCriticos('1|Uno', '2|Dos', '3|Tres'));

      expect(servicio.criticosNuevos()).toBe(0);
      expect(servicio.esNuevo(servicio.avisos()[2])).toBe(true);
      servicio.cerrarPanel();
      expect(servicio.esNuevo(servicio.avisos()[2])).toBe(false);
    });

    it('no cuenta los ya vistos después de recargar la página', () => {
      const servicio = crear();
      responder();
      servicio.abrirPanel();
      TestBed.resetTestingModule();

      const recargado = crear();
      responder();

      expect(guardado()).toEqual(CLAVES_CRITICAS);
      expect(recargado.criticosNuevos()).toBe(0);
    });

    it('lee lo guardado antes de que llegue la respuesta', () => {
      window.localStorage.setItem('obralia.avisos.vistos.1', JSON.stringify(['1|Uno']));
      const servicio = crear();
      responder();

      expect(servicio.criticosNuevos()).toBe(1);
    });

    it('ignora un valor guardado con formato inválido', () => {
      window.localStorage.setItem('obralia.avisos.vistos.1', '{no es json');
      const servicio = crear();
      responder();

      expect(servicio.criticosNuevos()).toBe(2);
    });

    it('elimina del conjunto las claves de avisos que ya no existen', () => {
      window.localStorage.setItem(
        'obralia.avisos.vistos.1',
        JSON.stringify(['1|Uno', '2|Dos', '9|Viejo']),
      );
      crear();
      responder();

      expect(guardado()).toEqual(CLAVES_CRITICAS);
    });

    it('cada usuario tiene su propio conjunto', () => {
      const servicio = crear();
      responder();
      servicio.abrirPanel();
      servicio.cerrarPanel();
      expect(servicio.criticosNuevos()).toBe(0);

      usuario.set({ id: 2 });
      TestBed.tick();
      expect(servicio.criticosNuevos()).toBe(2);
      servicio.abrirPanel();
      expect(guardado(2)).toEqual(CLAVES_CRITICAS);

      usuario.set({ id: 1 });
      TestBed.tick();
      expect(servicio.criticosNuevos()).toBe(0);
    });

    it('al cerrar sesión no borra lo guardado ni lo comparte con otro usuario', () => {
      const servicio = crear();
      responder();
      servicio.abrirPanel();

      usuario.set(null);
      permiso.set(false);
      TestBed.tick();

      expect(guardado()).toEqual(CLAVES_CRITICAS);
      expect(servicio.criticosNuevos()).toBe(0);
      expect(window.localStorage.length).toBe(1);
    });

    it('funciona igual con el estado en memoria si localStorage no está disponible', () => {
      const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });
      const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });
      try {
        const servicio = crear();
        responder();
        expect(servicio.criticosNuevos()).toBe(2);

        servicio.abrirPanel();

        expect(servicio.criticosNuevos()).toBe(0);
        refrescar(conCriticos('1|Uno', '2|Dos', '3|Tres'));
        expect(servicio.criticosNuevos()).toBe(0);
        servicio.cerrarPanel();
        refrescar(conCriticos('1|Uno', '2|Dos', '3|Tres', '4|Cuatro'));
        expect(servicio.criticosNuevos()).toBe(1);
      } finally {
        get.mockRestore();
        set.mockRestore();
      }
    });
  });
});
