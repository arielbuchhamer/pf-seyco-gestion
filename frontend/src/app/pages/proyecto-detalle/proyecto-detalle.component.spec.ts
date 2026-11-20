import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProyectoDetalleComponent } from './proyecto-detalle.component';

// httpResource deja pedidos pendientes, así que whenStable() nunca termina: se espera un ciclo.
async function pausa(fixture: ComponentFixture<ProyectoDetalleComponent>): Promise<void> {
  await new Promise((resolver) => setTimeout(resolver));
  fixture.detectChanges();
}

describe('ProyectoDetalleComponent: solapa por URL', () => {
  let http: HttpTestingController;

  async function crear(
    solapa?: string,
    conPresupuesto = false,
  ): Promise<ComponentFixture<ProyectoDetalleComponent>> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProyectoDetalleComponent);
    fixture.componentRef.setInput('id', '1');
    fixture.componentRef.setInput('solapa', solapa);
    fixture.detectChanges();
    await pausa(fixture);
    responderBase(fixture, conPresupuesto);
    await pausa(fixture);
    fixture.detectChanges();
    return fixture;
  }

  function responderBase(
    fixture: ComponentFixture<ProyectoDetalleComponent>,
    conPresupuesto: boolean,
  ): void {
    http
      .match('/api/proyectos/1')
      .forEach((r) => r.flush({ id: 1, nombre: 'Obra', estado: 'EN_CURSO' }));
    http.match((r) => r.url === '/api/tareas').forEach((r) => r.flush([]));
    http
      .match('/api/proyectos/1/presupuesto')
      .forEach((r) =>
        conPresupuesto
          ? r.flush({ totales: { total: 1000 }, items: [] })
          : r.flush('no hay', { status: 404, statusText: 'Not Found' }),
      );
    fixture.detectChanges();
  }

  function activa(fixture: ComponentFixture<ProyectoDetalleComponent>): string {
    const boton = (fixture.nativeElement as HTMLElement).querySelector('.solapa--activa');
    return boton?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function boton(
    fixture: ComponentFixture<ProyectoDetalleComponent>,
    texto: string,
  ): HTMLButtonElement {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.solapa'),
    ).find((b) => b.textContent?.includes(texto))!;
  }

  it('sin parámetro arranca en Tareas', async () => {
    expect(activa(await crear())).toContain('Tareas');
  });

  it.each([
    ['fechas', 'Carga de fechas'],
    ['gantt', 'Gantt'],
    ['indicadores', 'Indicadores'],
    ['costos', 'Costos reales'],
    ['certificaciones', 'Certificaciones'],
  ])('?solapa=%s abre %s', async (id, etiqueta) => {
    expect(activa(await crear(id))).toContain(etiqueta);
  });

  it('una solapa inexistente arranca en la de por defecto', async () => {
    expect(activa(await crear('inventada'))).toContain('Tareas');
  });

  it('Presupuesto sin presupuesto en el proyecto arranca en la de por defecto', async () => {
    expect(activa(await crear('presupuesto', false))).toContain('Tareas');
  });

  it('Presupuesto con presupuesto se abre', async () => {
    expect(activa(await crear('presupuesto', true))).toContain('Presupuesto');
  });

  it('cambiar de solapa dentro del proyecto sigue funcionando', async () => {
    const fixture = await crear('gantt');
    boton(fixture, 'Costos reales').click();
    fixture.detectChanges();
    expect(activa(fixture)).toContain('Costos reales');
  });

  it('si la URL cambia de solapa en la misma obra, se abre la nueva', async () => {
    const fixture = await crear('gantt');
    boton(fixture, 'Costos reales').click();
    fixture.componentRef.setInput('solapa', 'certificaciones');
    fixture.detectChanges();
    expect(activa(fixture)).toContain('Certificaciones');
  });
});
