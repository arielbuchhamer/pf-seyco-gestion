package com.seyco.gestion.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.Tarea;

public interface TareaRepository extends JpaRepository<Tarea, Long> {
}
