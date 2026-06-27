# pf-seyco-gestion

Aplicación web para la gestión de obras de Seyco S.A — Proyecto Final de carrera.

## Tecnologías

- **Backend:** Java 21 + Spring Boot 4.1.0
- **Frontend:** Angular
- **Base de datos:** PostgreSQL 16 (via Docker)

---

## Requisitos previos

Antes de clonar el proyecto, asegurate de tener instalado:

| Herramienta | Versión recomendada | Descarga |
|---|---|---|
| Java (JDK) | 21 | https://adoptium.net |
| Maven | 3.9+ | https://maven.apache.org/download.cgi |
| Node.js | 20+ | https://nodejs.org |
| Angular CLI | latest | incluido en `node_modules` (no requiere instalación global) |
| Docker | latest | https://www.docker.com/get-started |

---

## Estructura del proyecto

```
pf-seyco-gestion/
├── backend/        # Spring Boot (Java)
├── frontend/       # Angular
├── docker-compose.yml
└── README.md
```

---

## Levantar el proyecto

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/pf-seyco-gestion.git
cd pf-seyco-gestion
```

### 2. Levantar la base de datos

```bash
docker compose up -d
```

Esto levanta PostgreSQL automáticamente en el puerto `5432` con la base de datos `seyco`.

### 3. Levantar el backend

```bash
cd backend
mvn spring-boot:run
```

El backend queda disponible en `http://localhost:8080`

### 4. Levantar el frontend

Abrí otra terminal:

```bash
cd frontend
npm install
npm start
```

El frontend queda disponible en `http://localhost:4200`

---

## Uso diario

```bash
# Levantar la base de datos
docker compose up -d

# Levantar el backend (en una terminal)
cd backend && mvn spring-boot:run

# Levantar el frontend (en otra terminal)
cd frontend && npm start
```

### Apagar la base de datos

```bash
docker compose down
```

> ⚠️ `docker compose down -v` borra también los datos. Usalo solo si querés resetear la base.

> 💡 Si apagás o reiniciás la PC, el contenedor de Docker se detiene automáticamente. Al día siguiente recordá correr `docker compose up -d` antes de levantar el backend.

---

## Variables de entorno / Configuración

La configuración de la base de datos está en `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/seyco
spring.datasource.username=postgres
spring.datasource.password=1234
```
