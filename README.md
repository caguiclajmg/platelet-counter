<div align="center">
    <h1>platelet-counter</h1>
    <h4>Node.js counter app for <a href="https://github.com/caguiclajmg/platelet-clicker">platelet-clicker</a></h4>
    <img src="docs/preview.png" width="85%" />
    <h6>Image: はたらく細胞 / Cells at Work!</h6>
</div>

## Configuration

### config.json
```js
{
    "port": 8080, // The port where the webserver will listen on, only used if the PORT environment variable is not set.
    "secret": "platelet-counter", // Passphrase used to sign JWTs.
    "domain": "platelets.fun", // Domain identifier, used in JWT payload.
    "tokenExpiry": "5m", // Time before unused tokens expire
    "rateLimit": "30s", // Frequency at which users are only allowed to send `count` data
    "countDeltaLimit": 100 // Maximum value allowed for every `count` submission
}
```
## Usage
Install dependencies using `npm install` then start the webserver with `npm start`.