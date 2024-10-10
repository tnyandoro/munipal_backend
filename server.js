/*
    Steps to create node API/server
    - Install mysql and create db = https://dev.mysql.com/downloads/installer/
    - Install workbench, create db and db user
    - Creat dir for server
    - npm init
    - npm install --save express
    - npm install mysql2
    - Create server.js file
    - start with node server.js
*/

const http = require('http');
const app = require('./app');

const port = 9000;

const server = http.createServer(app);

//port forwarding
//https://www.youtube.com/watch?v=_w-Mc2NLZD8
// virtual server for public access
// ddns for domain

server.listen(port);