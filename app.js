const express = require('express');
const app = express();
const path = require('path');
// -----------------------Accept JSON from POST requests----------------
app.use(express.json());
// -----------------------Handle CORS-----------------------------------
app.use((request, response, next) => {
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Headers', '*');
    if (request.method === "OPTIONS") {
        response.header('Access-Control-Allow-Methods', '*');
        return response.status(200).json({});
    }
    next();
});
// -----------------------cardPictures-----------------------------------
app.use('/readingUploads/:userID/:date/:name', function (req, res) {
    const userID = req.params.userID;
    const date = req.params.date;
    const name = req.params.name;
    const file = `./readingUploads/${userID}/${date}/${name}`;
    res.download(file);
});
// -----------------------logo for email-----------------------------------
app.use('/logo', function (req, res) {
    const file = './logo/logo.jpg';
    res.download(file);
});
// -----------------------Routes/ API-----------------------------------
const userRoutes = require('./api/routes/user');
const meterRoutes = require('./api/routes/meter');
const failureRoutes = require('./api/routes/failure');

app.use('/user', userRoutes);
app.use('/meter', meterRoutes);
app.use('/failure', failureRoutes);
// -----------------------Error handling--------------------------------
app.use((request, response, next) => {
    const error = new Error("Not found");
    error.status = 404;
    next(error);
});
app.use((error, request, response, next) => {
    response.status(error.status || 500);
    response.json({
        error: error.message
    });
});

module.exports = app;