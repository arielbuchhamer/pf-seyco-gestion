import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Accion } from '../models/acceso.model';
import { AuthService } from '../services/auth.service';

// Muestra un elemento sólo si el usuario tiene ese permiso, como un @if pero sin repetir la condición.
// Mismo formato "<modulo>:<accion>" que los @PreAuthorize("hasAuthority(...)") del backend:
//   <button *puede="'proyectos:escribir'">Nuevo proyecto</button>
// Es sólo UX: ocultar un botón no protege nada si el endpoint del back no está restringido.
@Directive({ selector: '[puede]', standalone: true })
export class PuedeDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly puede = input.required<string>();

  private visible = false;

  constructor() {
    effect(() => {
      const [modulo, accion] = this.puede().split(':');
      const permitido = this.auth.puede(modulo, accion as Accion);

      if (permitido && !this.visible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else if (!permitido && this.visible) {
        this.viewContainer.clear();
      }
      this.visible = permitido;
    });
  }
}
