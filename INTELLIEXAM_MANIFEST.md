# 🧠 INTELLIEXAM V3 — TECHNICAL MANIFEST
**Project Status**: Production Ready (v3.5 - Mobile Optimized)  
**Lead AI Architect**: Antigravity (DeepMind)  
**Enterprise Vision**: AI-Driven Pedagogical OS

---

## 🏗️ ARCHITECTURE OVERVIEW
IntelliExam is a specialized SaaS for teachers following the **NEM 2022 (Nueva Escuela Mexicana)** framework. It automates exam grading, performance analytics, and lesson planning using a Hybrid-RAG approach.

### 💻 Tech Stack
- **Frontend**: Vanilla JS (ES6+) with a custom SPA framework. Design System: Cyber-Glassmorphism (Custom CSS Variables).
- **Backend**: Node.js + Express (Robust MVC Architecture).
- **Database**: Turso (Edge SQLite) — Designed for low latency global access.
- **AI Engine**: OpenAI GPT-4o-mini / GPT-4o with specialized system prompts.
- **OCR**: Integrated processing for handwritten/printed exam scanning.

---

## 🛠️ KEY COMPONENTS
1. **Ameyalli IA**: A pedagogical assistant with specific context on NEM 2022.
   - *Logic*: `backend/src/services/ai.service.js`
2. **Edge Analytics**: Generates real-time KPIs on student risk levels.
   - *Logic*: `backend/src/controllers/reports.controller.js`
3. **Turso Integration**: Optimized SQL queries for student management.
   - *Logic*: `backend/src/config/db.js`

---

## 📂 REPOSITORY STRUCTURE (For AI Analysis)
- `/frontend/app.html`: Single point of truth for UI/UX and SPA logic.
- `/backend/src/`: Core logic (Controllers, Services, Routes).
- `/backend/src/models/`: Database schema definitions (Turso/SQLite).
- `/Fixes_upgrade/`: Historical context of mobile and performance optimizations.

---

## 🚀 ROADMAP V5 PREVIEW (The "Entrepreneur" Move)
1. **Migration to Next.js 15**: Transition from Vanilla to a structured React framework for component reusability.
2. **Stripe Integration**: Implementation of "Free", "Teacher Pro", and "School Tier" subscription models.
3. **Pedagogical RAG 2.0**: Direct integration with SEP (Secretaría de Educación Pública) official textbooks via vector embeddings.
4. **Voice-to-Plan**: Ability for teachers to dictate lesson plans while driving or in class.

---
**Deployment URL**: [https://intelliexam-v3-production.up.railway.app](https://intelliexam-v3-production.up.railway.app)  
**Context**: This manifest ensures any future AI agent can take the baton and continue development without context loss.
