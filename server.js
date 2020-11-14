const express = require('express');
const http = require('http');

const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.set('view engine', 'ejs');

//Database connection
const uri = "mongodb+srv://tcc:bolinha123@bugfinder.2kunu.mongodb.net/bugfinderDev?retryWrites=true&w=majority";
let db;
const MongoClient = require('mongodb').MongoClient;
MongoClient.connect(uri, (err, client) => {
    if (err) {
        console.log(err);
        return;
    }

    db = client.db('bugfinderDev');
});

const server = http.createServer(app);
const hostname = 'localhost';
const port = 3000;
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

app.post('/sendData', (req, res) => {
    db.collection('dataAutomation').insert(req.body, (err, result) => {
        if (err) return console.log(err)

        console.log(req.body)
        res.send(req.body)
    })
})

app.get('/getMaps', (req, res) => {
    db.collection('dataAutomation').aggregate(
        [
            {
                '$project': {
                    'featureName': '$featureName',
                    'scenarioName': '$scenarioName',
                    'status': '$status',
                    'timestamp': {
                        '$dateFromString': {
                            'dateString': '$timestamp'
                        }
                    }
                }
            }, {
                '$match': {
                    'timestamp': {
                        '$gte': new Date('Wed, 01 Jan 2014 08:15:39 GMT'),
                        '$lt': new Date('Wed, 30 Dec 2020 08:15:39 GMT')
                    }
                }
            }, {
                '$project': {
                    'featureName': '$featureName',
                    'scenarioName': '$scenarioName',
                    'status': '$status',
                    'Hours': {
                        '$hour': '$timestamp'
                    },
                    'Day': {
                        '$dayOfMonth': '$timestamp'
                    },
                    'Month': {
                        '$month': '$timestamp'
                    },
                    'year': {
                        '$year': '$timestamp'
                    }
                }
            }, {
                '$group': {
                    '_id': {
                        'featureName': '$featureName'
                    },
                    'scenarios': {
                        '$addToSet': '$scenarioName'
                    }
                }
            }
        ]
    ).toArray((err, results) => {
        res.send(results);
    });
})

app.get('/getData', (req, res) => {
    db.collection('dataAutomation').createIndex({ dateDay: "text" })
    db.collection('dataAutomation').createIndex({ featureName: "text" })
    const dataBR = new Date(req.query.dateDay * 1000);
    let otherDate = new Date();
    dataBR.setHours(otherDate.getHours() - 3);
    db.collection('dataAutomation').aggregate([
        {
            '$project': {
                'featureName': '$featureName',
                'scenarioName': '$scenarioName',
                'status': '$status',
                'timestamp': {
                    '$dateFromString': {
                        'dateString': '$timestamp'
                    }
                }
            }
        }, {
            '$match': {
                'timestamp': {
                    '$gte': new Date(req.query.dateDay * 1000),
                    '$lt': new Date(new Date(req.query.dateDay * 1000).getTime() + 60 * 60 * 24 * 1000)
                }
            }
        },
        {
            '$match': {
                'featureName': req.query.featureName
            }
        },
        {
            '$project': {
                'featureName': '$featureName',
                'scenarioName': '$scenarioName',
                'status': '$status',
                'Hours': {
                    '$hour': '$timestamp'
                },
                'Day': {
                    '$dayOfMonth': '$timestamp'
                },
                'Month': {
                    '$month': '$timestamp'
                },
                'year': {
                    '$year': '$timestamp'
                }
            }
        }, {
            '$group': {
                '_id': {
                    'featureName': '$featureName',
                    'scenarioName': '$scenarioName',
                    'hour': '$Hours'
                },
                'total': {
                    '$sum': 1
                },
                'success': {
                    '$sum': {
                        '$cond': [
                            {
                                '$eq': [
                                    '$status', 'SUCCESS'
                                ]
                            }, 1, 0
                        ]
                    }
                },
                'failed': {
                    '$sum': {
                        '$cond': [
                            {
                                '$eq': [
                                    '$status', 'FAILED'
                                ]
                            }, 1, 0
                        ]
                    }
                }
            }
        }, {
            '$sort': {
                '_id.hour': 1
            }
        }, {
            '$group': {
                '_id': {
                    'scenarioName': '$_id.scenarioName'
                },
                'hours': {
                    '$push': {
                        'hour': '$_id.hour',
                        'quantity': '$quantity',
                        'success': '$success',
                        'failed': '$failed',
                        'total': '$total'
                    }
                }
            }
        }
    ]).toArray((err, results) => {
        res.send(results);
    });
})
