const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit: 100, 
    host: 'localhost',
    user: 'takang',
    password: 'aboki@84H',
    database: 'neotericDB',
    port: 3306,
});
module.exports = {pool}