const express = require('express')
const MongoClient = require('mongodb').MongoClient
const bodyParser = require('body-parser')
const app = express()
const uri = "mongodb+srv://tcc:bolinha123@bugfinder.2kunu.mongodb.net/bugfinderDev?retryWrites=true&w=majority"
let db
app.use(bodyParser.json())

MongoClient.connect(uri, (err, client) => {
    if (err) return console.log(err)

    db = client.db('bugfinderDev')

    app.listen(3000, function(){
        console.log('server running on port 3000')
    })
})

app.set('view engine', 'ejs')

app.post('/sendData', (req, res)=>{
    db.collection('dataAutomation').insert(req.body, (err, result)=> {
        if (err) return console.log(err)

        console.log(req.body)
        res.send(req.body)
    })
})

function iterateFunc(doc) {
    console.log(JSON.stringify(doc, null, 4));
}

function errorFunc(error) {
    console.log(error);
}

app.get('/getData', (req, res)=> {
    db.collection('dataAutomation').createIndex( { dateDay: "text" } )
    db.collection('dataAutomation').createIndex( { featureName: "text" } )
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
        }
    ]).toArray((err, results) => {
        if (err) return console.log(err)
        res.send(results);
    });
})
