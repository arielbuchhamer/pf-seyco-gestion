import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AvisoProyecto, RespuestaAvisos } from '../models/aviso.model';
import { AuthService } from './auth.service';

export const REFRESCO_AVISOS_MS = 5 * 60_000;
// El backend recorre todas las obras en cada pedido: abrir el panel varias veces seguidas
// no vuelve a consultar.
export const VIGENCIA_AVISOS_MS = 30_000;

const CLAVE_VISTOS = 'obralia.avisos.vistos.';

// Un aviso no tiene id propio: se lo reconoce por obra y título. Si se resuelve y vuelve a aparecer,
// es la misma clave (y por eso se vuelve a contar si ya se había limpiado del conjunto de vistos).
export function claveAviso(a: Pick<AvisoProyecto, 'proyectoId' | 'titulo'>): string {
  return a.proyectoId + '|' + a.titulo;
}

function leerVistos(usuarioId: number | null): ReadonlySet<string> {
  if (usuarioId == null) return new Set();
  try {
    const crudo = localStorage.getItem(CLAVE_VISTOS + usuarioId);
    const lista: unknown = crudo ? JSON.parse(crudo) : [];
    return new Set(Array.isArray(lista) ? lista.filter((c) => typeof c === 'string') : []);
  } catch {
    return new Set();
  }
}

function guardarVistos(usuarioId: number | null, vistos: ReadonlySet<string>): void {
  if (usuarioId == null) return;
  try {
    localStorage.setItem(CLAVE_VISTOS + usuarioId, JSON.stringify([...vistos]));
  } catch {
    // Sin localStorage los vistos duran hasta recargar la página.
  }
}

// Avisos reales de todas las obras (GET /api/avisos). Los usan la campanita, la barra lateral
// y la pantalla /avisos. Se cargan al iniciar sesión y se refrescan
// cada 5 minutos; al cerrar sesión (o si el rol no tiene proyectos:leer) se corta el timer y
// se borran los datos.
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly respuesta = signal<RespuestaAvisos | null>(null);

  readonly cargando = signal(false);
  readonly error = signal(false);

  readonly puedeVer = computed(() => this.auth.puede('proyectos', 'leer'));
  readonly avisos = computed(() => this.respuesta()?.avisos ?? []);
  readonly totales = computed(() => this.respuesta()?.totales ?? null);
  readonly criticos = computed(() => this.respuesta()?.totales.criticos ?? 0);

  // "Visto" sólo existe en este navegador y por usuario (no hay nada en el backend). Cambia el
  // usuario, cambia el conjunto: nunca se mezclan los de dos personas.
  private readonly usuarioId = computed(() => this.auth.currentUser()?.id ?? null);
  private readonly vistos = linkedSignal<number | null, ReadonlySet<string>>({
    source: this.usuarioId,
    computation: (id) => leerVistos(id),
  });
  private readonly panelAbierto = signal(false);
  // Críticos que eran nuevos cuando se abrió el panel: se marcan "Nuevo" hasta que se cierra.
  private readonly nuevosEnPanel = signal<ReadonlySet<string>>(new Set());

  // Lo que cuenta el globito de la campanita: críticos que el usuario todavía no vio.
  readonly criticosNuevos = computed(
    () =>
      this.avisos().filter((a) => a.nivel === 'CRITICA' && !this.vistos().has(claveAviso(a)))
        .length,
  );

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private pedido: Subscription | null = null;
  private ultimaCarga = 0;

  constructor() {
    effect(() => {
      const puede = this.puedeVer();
      untracked(() => (puede ? this.iniciar() : this.detener()));
    });
  }

  // Al abrir el panel de la campanita: lo que era nuevo se marca "Nuevo" y el globito baja a cero.
  abrirPanel(): void {
    this.panelAbierto.set(true);
    this.marcarVistos();
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
    this.nuevosEnPanel.set(new Set());
  }

  esNuevo(aviso: AvisoProyecto): boolean {
    return this.nuevosEnPanel().has(claveAviso(aviso));
  }

  private marcarVistos(): void {
    const vistos = this.vistos();
    const nuevos = this.avisos().filter((a) => a.nivel === 'CRITICA' && !vistos.has(claveAviso(a)));
    if (!nuevos.length) return;
    const claves = nuevos.map(claveAviso);
    this.vistos.set(new Set([...vistos, ...claves]));
    guardarVistos(this.usuarioId(), this.vistos());
    this.nuevosEnPanel.update((n) => new Set([...n, ...claves]));
  }

  // Quita de los vistos los avisos que ya no existen, para que el conjunto no crezca para siempre.
  private depurarVistos(avisos: AvisoProyecto[]): void {
    const existentes = new Set(avisos.map(claveAviso));
    const vistos = this.vistos();
    const quedan = [...vistos].filter((c) => existentes.has(c));
    if (quedan.length === vistos.size) return;
    this.vistos.set(new Set(quedan));
    guardarVistos(this.usuarioId(), this.vistos());
  }

  // Al abrir el panel o la pantalla de avisos. `forzar` ignora la vigencia (botón Actualizar).
  recargar(forzar = false): void {
    if (!this.puedeVer() || this.pedido) return;
    if (!forzar && !this.error() && Date.now() - this.ultimaCarga < VIGENCIA_AVISOS_MS) return;
    this.cargar();
  }

  private iniciar(): void {
    if (this.temporizador) return;
    // Si una pantalla ya pidió los datos antes de que corra este efecto, no se repite el pedido.
    if (!this.pedido) this.cargar();
    this.temporizador = setInterval(() => {
      if (!this.pedido) this.cargar();
    }, REFRESCO_AVISOS_MS);
  }

  private detener(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
    this.pedido?.unsubscribe();
    this.pedido = null;
    this.respuesta.set(null);
    this.cargando.set(false);
    this.error.set(false);
    this.ultimaCarga = 0;
  }

  private cargar(): void {
    this.cargando.set(true);
    const pedido = this.http.get<RespuestaAvisos>('/api/avisos').subscribe({
      next: (avisos) => {
        this.respuesta.set(avisos);
        this.depurarVistos(avisos.avisos);
        // Con el panel abierto lo que llega ya se está viendo.
        if (this.panelAbierto()) this.marcarVistos();
        this.error.set(false);
        this.ultimaCarga = Date.now();
        this.pedido = null;
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.pedido = null;
        this.cargando.set(false);
      },
    });
    // Si respondió de forma síncrona, `pedido` ya terminó y no hay nada que guardar.
    if (!pedido.closed) this.pedido = pedido;
  }
}
