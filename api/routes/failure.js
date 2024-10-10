const express = require('express');
const connection = require('../db/connect');
const router = express.Router();

// confirm
router.post('/confirm', (request, response, next) => {

    var userID = request.body.userID;
    var reason = request.body.reason;

    var sql = `INSERT INTO FailureReason (userID, reason, date) VALUES (${userID}, '${reason}', '${new Date().toISOString().slice(0, 19).replace('T', ' ')}')`;

    connection.query(sql, (err, readings) => {
        if (!err) {

            response.status(200).json({
                status: 'success',
            });
        }
    })
});

module.exports = router;