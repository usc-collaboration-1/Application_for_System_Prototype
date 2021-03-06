//FOR MongoDB

/*
 Configure the variables below
 */
var server_ip = 'ec2-54-67-99-52.us-west-1.compute.amazonaws.com';
var keyspace = 'ExpertSys';
var user = 'expertSys';
var psw = 'USCHuawei2016';
var server_port = 9666;
//declare what is the primary key for the table specified above.
var primary_key = '_id';

/*
 Required node module
 */
var mongodb = require('mongodb');
var express = require('express');
var bodyParser = require('body-parser');
var client = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var busboyBodyParser = require('busboy-body-parser');

var largeFile = require('./largeFile.js');

/*
 Initialize a connection to the MongoDB
 change the IP and keyspace so that it is according to your setting.
 */

var db_server = 'localhost:27617';
var url = 'mongodb://' + user + ':' + psw + '@' + db_server + '/' + keyspace + '?authMechanism=DEFAULT&authSource=' + keyspace;
var db;
client.connect(url, function (err, database) {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected successfully to database');
        db = database;
    }
});

//using express for RESTful communcation
var app = express();
app.use(busboyBodyParser());
//bodyparser is used to get the data from the body of POST/GET method
var urlencodedParser = bodyParser.urlencoded({ extended: true });   //for CRUD endpoints

//if you do not include the path in the node itself (pure rest from front end to backend) you need this below
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/ping', function (req, res) {
    res.send('Hello World');
});

// CRUD: Create
app.post('/create', urlencodedParser, function (req, res) {
    if (typeof(req.body.collection) !== 'undefined' &&
        typeof(req.body.data) !== 'undefined') {
        var data = JSON.parse(req.body.data);
        if (Array.isArray(data)) {
            db.collection(req.body.collection).insertMany(data, {w:1}, function(err, result) {
                if (err) {
                    res.sendStatus(400);
                }
                else {
		    let rst = {
			ops : result.result.ops,
			insertedCount : result.insertedCount,
			insertedId : result.insertedId
		    };
                    res.send(rst);
                }
            });
        } else {
            db.collection(req.body.collection).insertOne(data, {w:1}, function(err, result) {
                if (err) {
                    res.sendStatus(400);
                }
                else {
		    let rst = {
			ops : result.ops,
			insertedCount : result.insertedCount,
			insertedId : result.insertedId
		    };
                    res.send(rst);
                }
            });
        }
    }
});

//CRUD: ReadOne
//TODO: make sure the data is returned in JSON format
app.post('/readOne', urlencodedParser, function (req, res) {
    if (typeof(req.body.collection) === 'undefined') {
        res.send({});
        return;
    }
    if (typeof(req.body._id) !== 'undefined') {
        var query = {};
        query[primary_key] = new ObjectId(req.body._id);
        db.collection(req.body.collection).find(query).next(function(err, result){
            if (err) {
                res.sendStatus(400);
            }
            else {
                res.send(result);
            }
        });
    } else if (typeof(req.body.data) !== 'undefined') {
        var data = JSON.parse(req.body.data);
        db.collection(req.body.collection).find(data).next(function(err, result){
            if (err) {
                res.sendStatus(400);
            }
            else {
                res.send(result);
            }
        });
    }
});

//CRUD: ReadAll
//TODO: make sure the data is returned in JSON format
app.post('/readAll', urlencodedParser, function (req, res) {
    if (typeof(req.body.collection) === 'undefined') {
        res.send([]);
        return;
    }
    var data;
    if (typeof(req.body.data) === 'undefined')
        data = {};
    else
        data = JSON.parse(req.body.data);
    db.collection(req.body.collection).find(data).toArray(function(err, result){
        if (err) {
            res.sendStatus(400);
        }
        else {
            res.send(result);
        }
    });
});

//CRUD: Delete
app.post('/delete', urlencodedParser, function (req, res) {
    if (typeof(req.body.collection) === 'undefined') {
        res.send();
        return;
    }
    if (typeof(req.body._id) !== 'undefined') {
        // Remove one document by _id
        var query = {};
        query[primary_key] = new ObjectId(req.body._id);
        db.collection(req.body.collection).removeOne(query, {w:1}, function(err, result) {
            if (err) {
                res.sendStatus(500);
            }
            else {
                res.send(result);
            }
        });
    }else if (typeof(req.body.data) !== 'undefined') {
        // Remove several documents with same key-value pair
        var data = JSON.parse(req.body.data);

        db.collection(req.body.collection).removeMany(data, {w:1}, function(err, result) {
            if (err) {
                res.sendStatus(400);
            }
            else {
                res.send(result);
            }
        });
    }
});

//CRUD: Update
app.post('/update', urlencodedParser, function (req, res) {
    if (typeof(req.body.collection) === 'undefined' ||
        typeof(req.body.newData) === 'undefined') {
        res.sendStatus(400);
        return;
    }
    var newData = JSON.parse(req.body.newData);
    if (typeof(req.body._id) !== 'undefined') {
        // update one document by _id
        var query = {};
        query[primary_key] = new ObjectId(req.body._id);
        db.collection(req.body.collection).updateOne(query, {$set:newData}, {w:1}).then(function(result) {
            res.send(result);
        });
    }else if (typeof(req.body.oldData) !== 'undefined') {
        // Remove several documents with same key-value pair
        var data = JSON.parse(req.body.oldData);
        db.collection(req.body.collection).updateMany(data, {$set:newData}, {upsert:true, w:1}).then(function(result) {
            res.send(result);
        });
    }
});

app.post('/uploadFile', function (req, res) {
    largeFile.upload(db, req, res);
});

app.get('/downloadFile/:id', function (req, res) {
    largeFile.download(db, req, res);
});


//Server is running in port 9666; REST API should call ex. localhost:9666/readoneData etc...
var server = app.listen(server_port, server_ip, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("App listening at http://%s:%s", host, port)
});
