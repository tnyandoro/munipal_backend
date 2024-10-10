const express = require('express');
const connection = require('../db/connect');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// register
router.post('/register', (request, response, next) => {
    var email = request.body.email;
    var firstName = request.body.firstName;
    var password = crypto.createHash('md5').update(request.body.password).digest('hex');
    var address = request.body.address;
    var accountNumber = request.body.accountNumber;
    var emailToSendReadingTo = request.body.emailToSendReadingTo;
    var ERF = request.body.erf;
    var tariff = request.body.tariff;
    var utilityType = request.body.utilityType;
    // Check if account exists
    var sql = `SELECT email FROM users WHERE email = '${email}'`;
    connection.query(sql, (err, result) => {
        if (!err) {
            if (result.length > 0) {
                response.status(200).json({
                    status: 'This email is already registered',
                    data: result[0],
                }).end();
            }
            else {
                // Insert into users table
                var sql = `INSERT INTO users (email, first_name, password, address, accountNumber, emailToSendReadingTo, ERF, tariff, utilityType) VALUES ('${email}', '${firstName}', '${password}', '${address}', '${accountNumber}', '${emailToSendReadingTo}', '${ERF}', ${tariff}, '${utilityType}')`;
                connection.query(sql, (err, result) => {
                    if (!err) {
                        var sql = `SELECT * FROM users WHERE email = '${email}'`;
                        connection.query(sql, (err, result) => {
                            if (!err) {
                                response.status(200).json({
                                    status: 'success',
                                    data: result[0],
                                }).end();
                            }
                        });
                    }
                });
            }
        }
    })
});

// login
router.post('/login', (request, response, next) => {
    var email = request.body.email;
    var password = crypto.createHash('md5').update(request.body.password).digest('hex');
    // Check for account
    var sql = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
    connection.query(sql, (err, result) => {
        if (!err) {

            var status;
            if (result.length > 0) {
                status = "success";
            }
            else {
                status = "Incorrect email/password";
            }
            // Return user
            response.status(200).json({
                status: status,
                data: result[0],
            }).end();
        }
    })
});

// Reset Password
// generate
router.post('/generate', (request, response, next) => {
    var email = request.body.email;
    // Check if email exists
    var sql = `SELECT * FROM users WHERE email = '${email}'`;
    connection.query(sql, (err, result) => {
        if (!err) {
            if (result.length > 0) {
                var token = Math.random().toString(10).substring(7);
                var sql = `UPDATE users SET resetToken = '${token}' WHERE email = '${email}'`;
                connection.query(sql, (err, result) => {
                    if (!err) {
                        // Send email
                        let transport = nodemailer.createTransport({
                            host: 'smtp.qwertsy.co.za',
                            port: 587,
                            secure: false,
                            auth: {
                                user: 'support@qwertsy.co.za',
                                pass: 'ATMnN}M#y4iS'
                            },
                            tls: {
                                rejectUnauthorized: false
                            }
                        });
                        var message = {
                            from: 'support@qwertsy.co.za', // Sender address
                            to: `${email}`,         // List of recipients
                            subject: 'Forgot Password', // Subject line
                            text: `Please use this code to reset your account password: ${token}` // Plain text body
                        };
                        transport.sendMail(message, function (err, info) {
                            response.status(200).json({
                                status: 'success',
                                message: "We've sent you a reset token to your email",
                            }).end();
                        });
                    }
                });

            }
            else {
                response.status(200).json({
                    status: "No account was found with this email",
                }).end();
            }
        }
    });
});
// verify
router.post('/verify', (request, response, next) => {
    var email = request.body.email;
    var token = request.body.token;
    var sql = `SELECT * FROM users WHERE email = '${email}' AND resetToken = '${token}'`;
    connection.query(sql, (err, result) => {
        if (!err) {
            if (result.length > 0) {
                // Delete token
                var sql = `UPDATE users SET resetToken = NULL WHERE email = '${email}'`;
                connection.query(sql, (err, result) => {
                    response.status(200).json({
                        status: "success",
                    }).end();
                });
            }
            else {
                response.status(200).json({
                    status: "Incorrect reset code entered",
                }).end();
            }

        }
    });
});

// reset
router.post('/reset', (request, response, next) => {
    var email = request.body.email;
    var password = crypto.createHash('md5').update(request.body.password).digest('hex');
    var sql = `UPDATE users SET password = '${password}' WHERE email = '${email}'`;
    connection.query(sql, (err, result) => {
        if (!err) {
            // Delete token
            var sql = `SELECT * FROM users WHERE email = '${email}'`;
            connection.query(sql, (err, result) => {
                response.status(200).json({
                    status: "success",
                    data: result[0]
                }).end();
            });

        }
    });
});

// updateAccountDetails
router.post('/updateAccountDetails', (request, response, next) => {

    var id = request.body.id;
    var address = request.body.address;
    var accountNumber = request.body.accountNumber;
    var emailToSendReadingTo = request.body.emailToSendReadingTo;
    var ERF = request.body.ERF;
    var tariff = request.body.tariff;
    var utilityType = request.body.utilityType;

    var sql = `UPDATE users SET address = '${address}', accountNumber = '${accountNumber}', emailToSendReadingTo = '${emailToSendReadingTo}', ERF = '${ERF}', tariff = '${tariff}', utilityType = '${utilityType}' WHERE id = '${id}'`;
    
    connection.query(sql, (err, result) => {
        if (!err) {
            response.status(200).json({
                status: "success",
            }).end();
        }
    });
});

// getByID
router.post('/getByID', (request, response, next) => {
    var id = request.body.id;
    // Check for account
    var sql = `SELECT * FROM users WHERE id = ${id}`;
    connection.query(sql, (err, result) => {
        if (!err) {
            // Return user
            response.status(200).json({
                status: 'success',
                data: result[0],
            }).end();
        }
    })
});

module.exports = router;