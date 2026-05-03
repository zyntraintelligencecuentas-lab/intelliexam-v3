require('dotenv').config({ path: '../.env' });
const ai = require('../src/services/ai.service');

ai.generatePlaneacion('test_teacher', {materia:'Historia', grado:'3ro', tema:'Revolucion'})
  .then(res => console.log('SUCCESS:', Object.keys(res)))
  .catch(err => console.error('ERROR:', err));
