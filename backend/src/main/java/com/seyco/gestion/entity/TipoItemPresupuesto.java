package com.seyco.gestion.entity;

// Nivel de cada renglón del presupuesto, según la columna CODIGO del Excel de Seyco:
// stN = CAPITULO (se crea una Tarea), stN,M = GRUPO (se crea una subtarea),
// stN,MK = ARMADO (conjunto típico, cuelga del grupo) y cualquier otro código = ITEM.
public enum TipoItemPresupuesto {
	CAPITULO,
	GRUPO,
	ARMADO,
	ITEM
}
