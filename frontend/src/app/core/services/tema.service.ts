import { Injectable, effect, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

// Clave en localStorage. index.html la lee antes de que arranque Angular, así la app abre
// directamente en el tema elegido (sin un parpadeo claro al cargar).
export const CLAVE_TEMA = 'proxel.tema';

// Modo claro / oscuro. Se aplica con el atributo data-tema="oscuro" en <html>: styles.css
// redefine ahí las variables de color. La primera vez sigue la preferencia del sistema
// operativo; después, lo que eligió la persona (botón de la barra lateral).
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly tema = signal<Tema>(inicial());

  constructor() {
    effect(() => {
      const tema = this.tema();
      document.documentElement.dataset['tema'] = tema;
      try {
        localStorage.setItem(CLAVE_TEMA, tema);
      } catch {
        // Sin localStorage el tema dura hasta recargar la página.
      }
    });
  }

  alternar(): void {
    this.tema.update((t) => (t === 'oscuro' ? 'claro' : 'oscuro'));
  }
}

function inicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    // Sin localStorage: se usa la preferencia del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}
