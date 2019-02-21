const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const ms = require('ms');

const app = express();
const router = express.Router();

const tokens = {};

let count = 0;

function purgeExpiredTokens() {
    Object.entries(tokens).forEach(([token, tokenData]) => {
        try {
            if(!jwt.verify(token, process.env.SECRET, {
                issuer: process.env.DOMAIN
            })) {
                delete tokens[token];
            }
        } catch(e) {
            delete tokens[token];
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
    }

    if(!token) {
        responseError(res, 401, 'Missing Bearer Token');
        return;
    }

    if(!(token in tokens)) {
        responseError(res, 403, 'Unauthorized');
        return;
    }

    try {
        const payload = jwt.verify(token, process.env.SECRET, {
            issuer: process.env.DOMAIN
        });
    } catch(e) {
        responseError(res, 403, 'Unauthorized');
        return;
    }

    if(Date.now() < tokens[token].last + ms(process.env.LIMIT_DELTA_INTERVAL)) {
        responseError(res, 429, 'Too many requests');
        return;
    } else if(isNaN(countDelta)) {
        responseError(res, 400, 'Invalid countDelta value');
        return;
    }

    tokens[token].last = Date.now();
    count += (countDelta = Math.min(countDelta, process.env.LIMIT_DELTA_COUNT));

    responseSuccess(res, {count: count});
    return;
});

router.get('/token', (req, res) => {
    if(!('payload' in req.query)) {
        responseError(res, 400, 'Missing payload parameter');
        return;
    }

    const token = jwt.sign({
        payload: req.query.payload,
        created_at: Date.now(),
    }, process.env.SECRET, {
        expiresIn: process.env.TOKEN_EXPIRY,
        issuer: process.env.DOMAIN
    });

    tokens[token] = {
        last: Date.now() - ms(process.env.LIMIT_DELTA_INTERVAL)
    };

    responseSuccess(res, {
        token: token
    });
});

setInterval(purgeExpiredTokens, 5 * 1000);

app.use('/', router);
app.listen(process.env.PORT || 5000);
