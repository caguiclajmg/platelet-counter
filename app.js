'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const ms = require('ms');

const config = require('./config');

const app = express();
const router = express.Router();

var count = 0;
var tokens = {};

function purgeExpiredTokens() {
    Object.entries(tokens).forEach(([key, value]) => {
        if(Date.now() <= value.last + ms(config.tokenExpiry)) {
            delete tokens[key];
        }
    });
}

function responseError(res, code, message) {
    res.statusCode = code;
    res.json({error: {code: res.statusCode, message: message}});

    return res;
}

function responseSuccess(res, data) {
    res.statusCode = 200;
    res.json({data: data});

    return res;
}

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

router.get('/count', (req, res) => {
    responseSuccess(res, {count: count});
});

router.post('/count', (req, res) => {
    var auth = req.header('Authorization');
    if(!auth) {
        responseError(res, 403, 'Missing Authorization header');
        return;
    }

    const [method, token] = auth.split(' ');
    var countDelta = parseInt(req.body['countDelta'], 10);

    if(method.localeCompare('Bearer')) {
        responseError(res, 400, 'Unsuppoerted authentication scheme');
        return;
    } else if(!token) {
        responseError(res, 401, 'Missing Bearer Token');
        return;
    } else if(!(token in tokens)) {
        responseError(res, 403, 'Unauthorized');
        return;
    } else if(Date.now() < tokens[token].last + ms(config.rateLimit)) {
        responseError(res, 429, 'Too many requests');
        return;
    } else if(isNaN(countDelta)) {
        responseError(res, 400, 'Invalid countDelta value');
        return;
    }

    tokens[token].last = Date.now();
    count += (countDelta = Math.min(countDelta, config.countDeltaLimit));

    responseSuccess(res, {count: count});
    return;
});

router.get('/token', (req, res) => {
    const token = jwt.sign({iss: config.domain}, config.secret);

    tokens[token] = {last: Date.now() - ms(config.rateLimit)};

    responseSuccess(res, {token: token});
});

app.set('port', process.env.PORT || config.port);
app.use('/', router);
app.listen(app.get('port'));
console.log('platelet-counter running on port ' + app.get('port'));