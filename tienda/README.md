# Cafetería Andina

Aplicación web (HTML + JS) con persistencia en Supabase (PostgreSQL) y panel de Looker Studio embebido.

**Integrantes:** Fabian Andres Valdez Gonzalez

## Ejecución local
1. `cp .env.example .env` y completa `SUPABASE_URL`, `SUPABASE_KEY` (anon) y `LOOKER_URL`.
2. `node generate-config.js` (genera `config.js` desde `.env`).
3. `npx serve .` y abre http://localhost:3000.

## Base de datos
En Supabase → SQL Editor ejecuta `db/schema.sql` y luego `db/seed.sql`.
10 tablas, 80 pedidos, 151 detalles, 75 pagos, 430 métricas, 60 logs. La vista `v_ventas` alimenta Looker Studio.
Un trigger registra en `logs_auditoria` cada cambio en `pedidos`.

## Diagrama Entidad-Relación
```mermaid
erDiagram
  categorias ||--o{ productos : clasifica
  proveedores ||--o{ productos : suministra
  clientes ||--o{ pedidos : realiza
  empleados ||--o{ pedidos : atiende
  pedidos ||--|{ detalle_pedidos : contiene
  productos ||--o{ detalle_pedidos : "se vende en"
  pedidos ||--o{ pagos : "se paga con"
  categorias { bigint id PK
    text nombre }
  proveedores { bigint id PK
    text nombre
    text ciudad }
  productos { bigint id PK
    bigint categoria_id FK
    bigint proveedor_id FK
    text nombre
    numeric precio
    int stock }
  clientes { bigint id PK
    text nombre
    text email
    text ciudad }
  empleados { bigint id PK
    text nombre
    text cargo }
  pedidos { bigint id PK
    bigint cliente_id FK
    bigint empleado_id FK
    text estado
    text canal
    timestamptz creado_en }
  detalle_pedidos { bigint id PK
    bigint pedido_id FK
    bigint producto_id FK
    int cantidad
    numeric precio_unitario }
  pagos { bigint id PK
    bigint pedido_id FK
    text metodo
    numeric monto }
  logs_auditoria { bigint id PK
    text tabla
    text accion
    jsonb detalle }
  metricas_uso { bigint id PK
    date fecha
    text canal
    int visitas
    int pedidos_creados }
```

## Despliegue (Vercel o Netlify)
Build command: `node generate-config.js` · Output directory: `.` · Variables: `SUPABASE_URL`, `SUPABASE_KEY`, `LOOKER_URL`.

## Acceso a la base de datos
Host, puerto, base, usuario: Supabase → Project Settings → Database. _(Contraseña: entregar por el medio que indique el docente.)_
