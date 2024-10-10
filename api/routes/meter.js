const express = require('express');
const connection = require('../db/connect');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const async = require('async');
const fs = require('fs');
const formidable = require('formidable');
const path = require("path");

function replaceStr(str, find, replace) {
    for (var i = 0; i < find.length; i++) {
        str = str.replace(new RegExp(find[i], 'gi'), replace[i]);
    }
    return str;
}

// getCurrentMonthReadings
router.post('/getCurrentMonthReadings', (request, response, next) => {
    var id = request.body.id;

    var sql = `SELECT * FROM MeterReadings WHERE userID = ${id}`;
    connection.query(sql, (err, result) => {
        if (!err) {
            // Return user
            response.status(200).json({
                status: "success",
                data: result,
            }).end();
        }
    })
});

// getHistoryReadings
router.post('/getHistoryReadings', (request, response, next) => {

    var id = request.body.id;

    var date = new Date(request.body.date);
    date.setHours(0, 0, 0);

    var nextDate = new Date(request.body.date);
    nextDate.setHours(23, 59, 59)

    var sql = `SELECT * FROM MeterReadings WHERE date >= '${new Date(date).toISOString().slice(0, 19).replace('T', ' ')}' AND date < '${new Date(nextDate).toISOString().slice(0, 19).replace('T', ' ')}' AND userID = ${id}`;
    connection.query(sql, (err, readings) => {
        if (!err) {

            response.status(200).json({
                status: 'success',
                data: readings,
            });
        }
    })
});

// checkNumber
router.post('/checkNumber', (request, response, next) => {
    const form = formidable({ multiples: true });

    form.parse(request, (err, fields, files) => {

        // Upload
        var newPath = __dirname + "/" + Math.random().toString(36).substring(5) + ".jpg";
        fs.rename(files.file.path, newPath, function (err) {
            if (err) throw err
        });

        const worker = createWorker();
        (async () => {
            await worker.load();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789',
            });
            const { data: { text } } = await worker.recognize(newPath);
            fs.unlinkSync(newPath);
            await worker.terminate();
            response.status(200).json({
                status: 'success',
                data: text.replace(/\s/g, ""),
            });
        })();
    });
});

// saveReading
router.post('/saveReading', (request, response, next) => {

    const form = formidable({ multiples: true });
    form.parse(request, (err, fields, files) => {

        // Upload
        // Create DIR
        var target_path = `readingUploads/${fields.userID}/${new Date().toDateString()}/`;
        if (!fs.existsSync(target_path)) {
            fs.mkdirSync(target_path, { recursive: true });
        }
        // Move uploaded file
        var newPath = target_path + files.file.name;
        fs.rename(files.file.path, newPath, function (err) {
            if (err) throw err
        });

        var photoLink = 'http://196.216.137.101:9000/' + newPath;

        var sql = `INSERT INTO MeterReadings (userID, reading, date, utilityType, photo) VALUES (${fields.userID}, '${fields.reading}', '${new Date().toISOString().slice(0, 19).replace('T', ' ')}', '${fields.utilityType}', '${photoLink}')`;
        connection.query(sql, (err, readings) => {
            if (!err) {
                // Get info for email
                var sql = `SELECT ERF, accountNumber, address, email, first_name FROM users WHERE id = ${fields.userID}`;
                connection.query(sql, (err, userDetails) => {
                    if (!err) {
                        var sql = `SELECT * FROM MeterReadings WHERE userID = ${fields.userID} AND utilityType = '${fields.utilityType}' ORDER BY date DESC LIMIT 1 OFFSET 1 ;`;
                        connection.query(sql, (err, prevReading) => {
                            if (!err) {

                                var replace;

                                if(prevReading.length > 0)
                                {
                                    replace = [
                                        userDetails[0].ERF,
                                        userDetails[0].accountNumber,
                                        userDetails[0].email,
                                        userDetails[0].first_name,
                                        userDetails[0].address,
                                        new Date().toISOString().slice(0, 19).replace('T', ' '),
                                        prevReading[0].reading,
                                        fields.reading,
                                        parseInt(fields.reading) - parseInt(prevReading[0].reading),
                                        parseInt(fields.reading) - parseInt(prevReading[0].reading),
                                        fields.reading,
                                        fields.reading * prevReading[0].reading,
                                        fields.utilityType
                                    ];
                                }
                                else
                                {
                                    replace = [
                                        userDetails[0].ERF,
                                        userDetails[0].accountNumber,
                                        userDetails[0].email,
                                        userDetails[0].first_name,
                                        userDetails[0].address,
                                        new Date().toISOString().slice(0, 19).replace('T', ' '),
                                        'No previous reading',
                                        fields.reading,
                                        'No previous reading',
                                        'No previous reading',
                                        fields.reading,
                                        'No previous reading',
                                        fields.utilityType
                                    ];
                                }

                                fs.readFile(path.resolve(__dirname, "meter.html"), 'utf8', function (err, data) {
                                    var find = [
                                        '{{ERF}}',
                                        '{{AccNo}}',
                                        '{{Ini}}',
                                        '{{email}}',
                                        '{{add}}',
                                        '{{date}}',
                                        '{{wPrev}}',
                                        '{{wCurr}}',
                                        '{{wCon}}',
                                        '{{EPrev}}',
                                        '{{ECurr}}',
                                        '{{ECon}}',
                                        '{{readingType}}'
                                    ];
                                    
                                    data = replaceStr(data, find, replace);

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
                                        to: `${fields.emailToSendReadingTo}`,         // List of recipients
                                        subject: 'New Meter Reading', // Subject line
                                        // text: `Reading is: ${reading}` // Plain text body
                                        html: data,
                                        attachments: [
                                            {
                                                filename: 'reading.jpg',
                                                path: photoLink,
                                                cid: 'wImage'
                                            },
                                        ]
                                    };
                                    transport.sendMail(message, function (err, info) {
                                        response.status(200).json({
                                            status: 'success',
                                        });
                                    });
                                });
                            }
                        });
                    }
                });
            }
        })
    });
});

// getReadingDetails
router.post('/getReadingDetails', (request, response, next) => {

    var readingID = request.body.readingID;
    var userID = request.body.userID;
    var tariff = request.body.tariff;
    // Get reading details
    var sql = `SELECT * FROM MeterReadings WHERE id = ${readingID} AND userID = ${userID}`;
    connection.query(sql, (err, reading) => {
        if (!err) {

            // Get previous reading
            var sql = `SELECT * FROM MeterReadings WHERE userID = ${userID} AND utilityType = '${reading[0].utilityType}' ORDER BY date DESC LIMIT 1 OFFSET 1;`;
            connection.query(sql, (err, prevReading) => {

                var consumption;
                var data;

                if (prevReading.length > 0) {
                    consumption = reading[0].reading - prevReading[0].reading;
                    data = {
                        prev: prevReading[0].reading,
                        consumption: consumption,
                        tariff: tariff,
                        charge: tariff * consumption,
                        photo: reading[0].photo,
                        reading: reading[0].reading,
                        date: reading[0].date,
                        utilityType: reading[0].utilityType
                    }
                }
                else {
                    consumption = 0
                    data = {
                        prev: 'No previous reading found',
                        consumption: consumption,
                        tariff: tariff,
                        charge: tariff * consumption,
                        photo: reading[0].photo,
                        reading: reading[0].reading,
                        date: reading[0].date,
                        utilityType: reading[0].utilityType
                    }
                }


                response.status(200).json({
                    status: 'success',
                    data: data
                });
            });
        }
    });
});

// getLatestReading
router.post('/getLatestReading', (request, response, next) => {

    var userID = request.body.userID;
    var tariff = request.body.tariff;
    var newReading = request.body.reading;
    var utilityType = request.body.utilityType;
    // Get reading details
    var sql = `SELECT * FROM MeterReadings WHERE userID = ${userID} AND utilityType = '${utilityType}' ORDER BY date DESC LIMIT 1;`;
    connection.query(sql, (err, reading) => {
        if (!err) {

            if (reading.length > 0) {

                // Check if reading is more than previous
                if (parseInt(newReading) < parseInt(reading[0].reading)) {
                    response.status(200).json({
                        status: 'The current reading may not be less than the previous reading',
                    });
                    return;
                }

                var consumption = parseInt(newReading) - parseInt(reading[0].reading);

                response.status(200).json({
                    status: 'success',
                    data: {
                        prev: reading[0].reading,
                        consumption: consumption,
                        tariff: tariff,
                        charge: tariff * consumption,
                        photo: reading[0].photo, // used for email?
                        reading: parseInt(newReading),
                        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                        utilityType: utilityType
                    }
                });
            }
            else {
                response.status(200).json({
                    status: 'success',
                    data: {
                        prev: 'No previous reading found',
                        consumption: parseInt(newReading),
                        tariff: tariff,
                        charge: tariff * parseInt(newReading),
                        photo: "",
                        reading: parseInt(newReading),
                        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                        utilityType: utilityType
                    }
                });
            }
        }
    });
});

// sendReadingEmail
router.post('/sendReadingEmail', (request, response, next) => {

    // const form = formidable({ multiples: true });
    var userID = request.body.userID;
    var reading = request.body.reading;
    var emailToSendReadingTo = request.body.emailToSendReadingTo;
    var utilityType = request.body.utilityType;
    var date = request.body.date;

    var formattedDate = new Date(date).setHours(new Date(date).getHours() + 2);

    // Get info for email
    var sql = `SELECT ERF, accountNumber, address, email, first_name FROM users WHERE id = ${userID}`;
    connection.query(sql, (err, userDetails) => {
        if (!err) {
            var sql = `SELECT * FROM MeterReadings WHERE userID = ${userID} AND reading = '${reading}' AND date = '${new Date(formattedDate).toISOString().slice(0, 19).replace('T', ' ')}' AND utilityType = '${utilityType}';`;

            connection.query(sql, (err, currReading) => {
                if (!err) {
                    var sql = `SELECT * FROM MeterReadings WHERE userID = ${userID} AND utilityType = '${utilityType}' AND date < '${new Date(formattedDate).toISOString().slice(0, 19).replace('T', ' ')}' ORDER BY date DESC LIMIT 1;`;

                    connection.query(sql, (err, prevReading) => {
                        if (!err) {

                            fs.readFile(path.resolve(__dirname, "meter.html"), 'utf8', function (err, data) {
                                var find = [
                                    '{{ERF}}',
                                    '{{AccNo}}',
                                    '{{Ini}}',
                                    '{{email}}',
                                    '{{add}}',
                                    '{{date}}',
                                    '{{wPrev}}',
                                    '{{wCurr}}',
                                    '{{wCon}}',
                                    '{{readingType}}'
                                ];

                                if (prevReading.length > 0) {
                                    var replace = [
                                        userDetails[0].ERF,
                                        userDetails[0].accountNumber,
                                        userDetails[0].email,
                                        userDetails[0].first_name,
                                        userDetails[0].address,
                                        new Date().toISOString().slice(0, 19).replace('T', ' '),
                                        prevReading[0].reading,
                                        currReading[0].reading,
                                        parseInt(currReading[0].reading) - parseInt(prevReading[0].reading),
                                        currReading[0].utilityType
                                    ];
                                }
                                else {
                                    var replace = [
                                        userDetails[0].ERF,
                                        userDetails[0].accountNumber,
                                        userDetails[0].email,
                                        userDetails[0].first_name,
                                        userDetails[0].address,
                                        new Date().toISOString().slice(0, 19).replace('T', ' '),
                                        'No previous reading',
                                        currReading[0].reading,
                                        'No previous reading',
                                        currReading[0].utilityType
                                    ];
                                }


                                data = replaceStr(data, find, replace);

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
                                    to: `${emailToSendReadingTo}`,         // List of recipients
                                    subject: 'Meter Reading Details',
                                    cc: [userDetails[0].email], // Subject line
                                    html: data,
                                    attachments: [
                                        {
                                            filename: 'reading.jpg',
                                            path: currReading[0].photo,
                                            cid: 'wImage'
                                        },
                                        {
                                            filename: 'logo.jpg',
                                            path: 'http://196.216.137.101:9000/logo',
                                            cid: 'logo'
                                        },
                                    ]
                                };
                                transport.sendMail(message, function (err, info) {
                                    response.status(200).json({
                                        status: 'success',
                                    });
                                });
                            });
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;