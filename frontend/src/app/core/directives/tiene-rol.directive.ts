import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Rol } from '../models/usuario.model';
import { AuthService } from '../services/auth.service';

// Muestra un elemento sólo a ciertos roles, como un @if pero sin repetir la condición:
//   <button *tieneRol="'ADMINISTRADOR'">…</button>
//   <div *tieneRol="['ADMINISTRADOR', 'USUARIO']">…</div>
// Es sólo UX: ocultar un botón no protege nada si el endpoint del back no está restringido.
@Directive({ selector: '[tieneRol]', standalone: true })
export class TieneRolDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly tieneRol = input.required<Rol | Rol[]>();

  private visible = false;

  constructor() {
    effect(() => {
      const roles = this.tieneRol();
      const permitido = this.auth.tieneRol(...(Array.isArray(roles) ? roles : [roles]));

      if (permitido && !this.visible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else if (!permitido && this.visible) {
        this.viewContainer.clear();
      }
      this.visible = permitido;
    });
  }
}
