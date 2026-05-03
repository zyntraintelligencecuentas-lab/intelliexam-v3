# 🧠 INTELLIEXAM V4 - MANIFIESTO TÉCNICO CORE
**Contexto para Auditoría de IA y Desarrollo Continuo**

## 1. Visión del Proyecto
IntelliExam es una plataforma diseñada para reducir la carga administrativa docente en un 80% mediante IA generativa. Se especializa en el contexto educativo mexicano (NEM 2022) y utiliza RAG para garantizar precisión pedagógica.

## 2. Stack Tecnológico
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+). Diseño "Bento Grid" y estética Aurora.
- **Backend**: Node.js (v18+) con Express.
- **Base de Datos**: 
  - **Relacional**: Turso (SQLite Edge) para gestión de usuarios, alumnos y exámenes.
  - **Vectorial**: Supabase Vector Store para el sistema RAG de libros SEP.
- **IA**: OpenAI API (GPT-4o para planeaciones, GPT-4o-mini para chat rápido).
- **Despliegue**: Railway (PaaS) con CI/CD desde GitHub.

## 3. Estructura de Archivos Clave
- `/backend/server.js`: Punto de entrada del servidor y configuración de middleware (CORS, Static Files).
- `/backend/src/services/ai.service.js`: Lógica de inyección de contexto RAG y prompts maestros.
- `/frontend/app.html`: Interfaz única de usuario (SPA) con manejo de estados por navegación DOM.
- `package.json`: Definición de scripts de despliegue y dependencias.

## 4. Repositorio y Acceso
- **GitHub**: [https://github.com/zyntraintelligencecuentas-lab/intelliexam-v3](https://github.com/zyntraintelligencecuentas-lab/intelliexam-v3)
- **Producción**: [https://intelliexam-v3-production.up.railway.app](https://intelliexam-v3-production.up.railway.app)

## 5. Próximos Pasos (V5)
- Implementación de WebSockets para streaming de texto.
- Migración a arquitectura de Microservicios para el motor de OCR.
- Sistema de pagos (Stripe) integrado para suscripciones PRO.
