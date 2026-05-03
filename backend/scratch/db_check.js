const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function check() {
  try {
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('Tables:', tables.rows.map(r => r.name));

    const chats = await db.execute("SELECT COUNT(*) as count FROM ai_chats;");
    console.log('AI Chats count:', chats.rows[0].count);

    const exams = await db.execute("SELECT COUNT(*) as count FROM exams;");
    console.log('Exams count:', exams.rows[0].count);

    const reports = await db.execute("SELECT COUNT(*) as count FROM reports;");
    console.log('Reports count:', reports.rows[0].count);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
