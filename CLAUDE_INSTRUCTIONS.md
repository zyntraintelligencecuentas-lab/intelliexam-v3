# Instrucciones para Claude Terminal (Actualización de Frontend)

Hola Claude Terminal. Tu tarea es actualizar el archivo `fronted/app.html` para integrar las nuevas funcionalidades del backend que ya han sido desarrolladas. Por favor, lee atentamente estas instrucciones y ejecuta los cambios en el archivo `fronted/app.html`.

## Contexto de los Cambios en el Backend
El backend ya fue actualizado con los siguientes endpoints:
- **Importación CSV:** `POST /api/students/import` (Body: `{ csv_data: "..." }`)
- **Historial de Chats:** `GET /api/ai/history`, `GET /api/ai/sessions`, `GET /api/ai/sessions/:sessionId`, `DELETE /api/ai/sessions/:sessionId`
- **Generación de PDFs:** `POST /api/reports/pdf/planeacion` y `POST /api/reports/pdf/group`

## Tareas a realizar en `fronted/app.html`

### 1. Fix de Responsive Design
- Ajusta el CSS (Media Queries) para que la caja de texto del chat no se corte en pantallas móviles.
- Asegúrate de que el sidebar sea colapsable o se adapte correctamente en móviles.

### 2. Integración de Importación CSV de Alumnos
- **UI:** Agrega un botón "Importar CSV" en la vista de alumnos (`#studentsView`).
- **Modal:** Crea un modal simple con un `<textarea id="csvData">` o un input de archivo para pegar/subir el CSV.
- **Formato CSV:** Informa al usuario que el formato es: `Número, Nombre, Notas` (separado por comas).
- **Lógica JS:** Crea la función `importCSV()` que lea el textarea, haga un `POST` a `/api/students/import` con el token de auth, y luego recargue la lista de alumnos (`fetchStudents()`).

### 3. Integración de Historial de Chats (Ameyalli IA)
- **UI:** En la vista de IA (`#aiView`), agrega un panel lateral o un botón "Historial" que despliegue las sesiones anteriores.
- **Lógica JS:** 
  - Al abrir el historial, haz un `GET` a `/api/ai/sessions`.
  - Muestra la lista de sesiones.
  - Al hacer clic en una sesión, haz `GET` a `/api/ai/sessions/:sessionId` y pinta los mensajes en el chat.
  - Añade un botón de "Eliminar" junto a cada sesión que llame a `DELETE /api/ai/sessions/:sessionId`.

### 4. Generación de PDFs (Planeaciones y Grupal)
- **Reporte Grupal:** En la vista de alumnos, añade un botón "Generar Reporte PDF". Este botón debe llamar a `POST /api/reports/pdf/group`.
- **Planeaciones (IA):** En el chat de IA, si el usuario pide una planeación, puedes tener un botón rápido "Generar Planeación" que llame a `POST /api/reports/pdf/planeacion` con los parámetros (`materia`, `grado`, `tema`).
- **Manejo del HTML:** Los endpoints devuelven un objeto JSON con una propiedad `html`. Debes abrir una nueva ventana emergente, inyectar el HTML y llamar a `window.print()` para generar el PDF de forma nativa.
  ```javascript
  // Ejemplo de impresión
  const printWindow = window.open('', '_blank');
  printWindow.document.write(data.html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
  ```

### 5. Personalidad Ameyalli
- Asegúrate de que la UI refleje el nombre "Ameyalli" en lugar de nombres genéricos de IA, y ajusta los mensajes de bienvenida del chat.

---
**Nota para Claude:** Procesa estos cambios paso a paso. Es recomendable que primero implementes la importación CSV, luego los PDFs y finalmente el historial de chat para no sobresaturar el archivo de una sola vez. No necesitas reescribir todo el archivo de cero, puedes usar comandos de reemplazo o editar secciones específicas.
