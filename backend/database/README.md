# 🗄️ Base de Datos IntelliExam

## Ejecutar el Schema en TURSO

### Opción 1: Desde la CLI de Turso (Recomendado)

```bash
# 1. Instala Turso CLI si no lo tienes
# Windows: winget install chiselstrike.turso
# Mac: brew install tursodatabase/tap/turso
# Linux: curl -sSfL https://get.tur.so/install.sh | bash

# 2. Conéctate a tu base de datos
turso db shell intelliexam-zyntraintelligencecuentas-lab

# 3. Una vez dentro del shell, copia y pega TODO el contenido de schema.sql
# O ejecuta directamente:
.read schema.sql
```

### Opción 2: Desde el Dashboard Web de Turso

1. Ve a https://app.turso.tech/
2. Selecciona tu base de datos: `intelliexam-zyntraintelligencecuentas-lab`
3. Ve a la pestaña **SQL Console**
4. Copia y pega el contenido completo de `schema.sql`
5. Ejecuta el script

### Opción 3: Usando archivo local

```bash
# Desde la carpeta backend/database/
turso db shell intelliexam-zyntraintelligencecuentas-lab < schema.sql
```

---

## 📊 Tablas Creadas

1. **profiles** - Usuarios/Profesores
2. **auth** - Autenticación (passwords)
3. **students** - Estudiantes
4. **exams** - Exámenes
5. **exam_results** - Resultados de exámenes
6. **reports** - Reportes generados
7. **ai_chats** - Historial de conversaciones con IA

### Vistas (Views)
- **student_stats** - Estadísticas agregadas por estudiante
- **teacher_overview** - Resumen global del profesor

---

## 🧪 Verificar que funcionó

Después de ejecutar el schema, verifica:

```sql
-- Ver todas las tablas
SELECT name FROM sqlite_master WHERE type='table';

-- Ver usuario demo
SELECT * FROM profiles WHERE email = 'demo@intelliexam.com';
```

---

## 👤 Usuario de Prueba

El schema incluye un usuario demo:

```
Email: demo@intelliexam.com
Password: Demo1234
```

Puedes probarlo con:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@intelliexam.com","password":"Demo1234"}'
```

---

## 🔄 Resetear la Base de Datos

Si necesitas empezar de cero:

```sql
-- Eliminar todas las tablas
DROP TABLE IF EXISTS ai_chats;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS exam_results;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS auth;
DROP TABLE IF EXISTS profiles;

DROP VIEW IF EXISTS student_stats;
DROP VIEW IF EXISTS teacher_overview;

-- Luego ejecuta schema.sql nuevamente
```

---

## 📝 Notas

- Todas las tablas usan `TEXT` para IDs (UUIDs)
- Los timestamps son automáticos con `CURRENT_TIMESTAMP`
- Hay índices para optimizar las consultas más comunes
- Las relaciones tienen `ON DELETE CASCADE` para limpieza automática
