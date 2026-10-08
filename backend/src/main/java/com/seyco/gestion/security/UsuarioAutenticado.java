package com.seyco.gestion.security;

import java.security.Principal;

// Principal que deja SesionAuthenticationFilter en el SecurityContext. getName() devuelve el
// email, así authentication.getName() sigue funcionando en los controllers que lo usaban.
// En un controller: @AuthenticationPrincipal UsuarioAutenticado usuario.
public record UsuarioAutenticado(Long id, String email, String token) implements Principal {

	@Override
	public String getName() {
		return email;
	}
}
