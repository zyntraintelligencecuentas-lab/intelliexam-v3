import fs from 'fs';
import path from 'path';

const aiServicePath = path.join(process.cwd(), 'backend', 'src', 'services', 'ai.service.js');
let content = fs.readFileSync(aiServicePath, 'utf8');

// 1. Añadir el require al principio
if (!content.includes('PLANEACION_NEM_2022_PROMPT')) {
  content = content.replace(
    "const { logger, logAIUsage, logError } = require('../middleware/logger');",
    "const { logger, logAIUsage, logError } = require('../middleware/logger');\nconst { PLANEACION_NEM_2022_PROMPT } = require('../prompts/planeacion-nem-2022');"
  );
}

// 2. Reemplazar el prompt hardcodeado por la función importada
// The regex below removes from `const prompt = \`Eres Ameyalli, la asistente pedagógica experta de IntelliExam.` to `generar la mejor versión posible con la información disponible.\`;`
const promptRegex = /const prompt = `Eres Ameyalli[\s\S]*?con la información disponible\.`;/g;
content = content.replace(promptRegex, 'const prompt = PLANEACION_NEM_2022_PROMPT(materia, grado, tema, duracion, semanas);');

fs.writeFileSync(aiServicePath, content, 'utf8');
console.log('ai.service.js modificado correctamente.');
