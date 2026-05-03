require('dotenv').config({path: '../.env'});
const { turso } = require('../src/config/turso');
turso.execute("SELECT sql FROM sqlite_master WHERE type='table';").then(res => console.log(res.rows.map(r => r.sql).join('\n\n')));
