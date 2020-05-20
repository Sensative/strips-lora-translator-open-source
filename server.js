
const raw_translate = require ('./raw-translate');
const https = require('https');
const fs = require('fs');
const url = require('url');
var apikeys = [];
try {
    apikeys = fs.readdirSync('./apikeys');
} catch {};

apikeys.length > 0 || console.log("*** No API keys folder present or folder empty. Proceeding without API access control.");


const hex2data = hex => {
    if (hex.length %2 !== 0)
        return null; // Must be even number of hex characters
    let c = 0;
    const bytes = [];
    for (bytes; c < hex.length; c += 2) {
        let b = parseInt(hex.substr(c, 2), 16);
        if (isNaN(b)) 
            return null; // Bad data input
        bytes.push(b);
    }
    return bytes;
};

console.log("*** Attempting to read HTTPS key.pem and certificate.pem from ./cert/ folder, not included in this repo.");
console.log("*** Obtain these files from your ISP, a commercial certificate, or by generating your own certificate.");
const options = {
    key: fs.readFileSync('cert/key.pem'),
    cert: fs.readFileSync('cert/cert.pem')
};

if (parseInt(process.env.PORT) === NaN) {
    console.log("Please set environment variable PORT to define which port to serve.");
    return 1;   
}

console.log("");
console.log("Creating https server at port " + process.env.PORT)
https.createServer(options, function (req, res) {
    console.log("Handling " + req.url);
    const query = url.parse(req.url, true).query;
    const pathname = url.parse(req.url, true).pathname;
    if (pathname != '/translate') {
        console.log("Unknown function " + pathname);
        res.writeHead(400);
        res.end("Unknown function " + pathname);
        return;
    }

    const loraPort = parseInt(query.p);
    if (isNaN(loraPort) || loraPort < 1) {
        console.log("missing port");
        res.writeHead(400);
        res.end("Missing parameter 'p' (port, integer)");
        return;
    }

    const loraData = query.d;
    if (typeof(loraData) !== 'string') {
        console.log("missing data");
        res.writeHead(400);
        res.end("Missing parameter 'd' (data), should be string of hexadecimal digits");
        return;
    }

    console.log("port: " + loraPort);
    console.log("data: " + loraData);

    const bytes = hex2data(loraData);
    if (bytes === null) {
        console.log("bad data");
        res.writeHead(400);
        res.end("Bad parameter 'd' (data), hexadecimal digits could not be converted");
        return;
    }

    if (apikeys.length > 0) {
        const apikey = query.k;
        console.log ("key: " + apikey);
        if (apikeys.findIndex(k=>k==apikey) == -1) {
            console.log("bad/missing key");
            res.writeHead(400);
            res.end("API key does not match a registerred key");
            return;
        }
    }

    const object = raw_translate(bytes, loraPort);
    console.log(object);
    res.writeHead(200);
    res.end(JSON.stringify(object));
}).listen(process.env.PORT);

