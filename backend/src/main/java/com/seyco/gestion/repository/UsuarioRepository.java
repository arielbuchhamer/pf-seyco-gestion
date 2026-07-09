package com.seyco.gestion.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

	Optional<Usuario> findByEmail(String email);
}
