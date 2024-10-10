const mysql = require('mysql2');

const connection = mysql.createPool({
    host: "localhost",
    port: '3306',
    user: "S3Rve!fY",
    password: 'G^"+=Knp7P',
    database: 'municipality',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
});

connection.getConnection(err => {
    if (!err) {
        console.log("Munipal API - Connected!");
    }
})

module.exports = connection;