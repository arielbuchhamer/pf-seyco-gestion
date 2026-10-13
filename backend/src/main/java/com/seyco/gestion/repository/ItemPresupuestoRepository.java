package com.seyco.gestion.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.seyco.gestion.entity.ItemPresupuesto;

public interface ItemPresupuestoRepository extends JpaRepository<ItemPresupuesto, Long> {

	List<ItemPresupuesto> findByPresupuestoIdOrderByOrdenAsc(Long presupuestoId);

	List<ItemPresupuesto> findByTareaId(Long tareaId);
}
