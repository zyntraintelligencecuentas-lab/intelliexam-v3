const fetch = require('node-fetch');

async function testPlanning() {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.access_token) {
    console.error('Login failed:', loginData);
    return;
  }
  
  const token = loginData.access_token;
  console.log('Token obtained');
  
  const planRes = await fetch('http://localhost:3001/api/reports/planeacion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      materia: 'Ciencias',
      grado: '3 Primaria',
      tema: 'El agua',
      duracion: '50 min',
      semanas: 1
    })
  });
  
  const planData = await planRes.json();
  console.log('Result:', planData);
}

testPlanning();
