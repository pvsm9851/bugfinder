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
    db.collection('dataAutomation').createIndex( { featureName: "text" } )
    const data = db.collection('dataAutomation').find({ $text: { $search: req.query.feature } }).toArray((err, results) => {
        if (err) return console.log(err)
        console.log(results);
        res.send(results);
    });
})
