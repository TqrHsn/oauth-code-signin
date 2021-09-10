const fs = require('fs');

const programName = "oauth-code-token";
const version = "v0.0.1";

const args = process.argv.slice(2);

var config = {}
if (args.length > 0) {
  if (args[0] == "--config" || args[0] == "-c") {
    if (args.length < 2) {
      console.error("File name is required with this argument.");
      process.exit();
    } else {
      let configFile = args[1];
      try {
        if (!fs.existsSync(configFile)) {
          console.error(`File ${configFile} does not exist.`);
          process.exit();
        } else {
          config = JSON.parse(fs.readFileSync(configFile));
        }
      } catch (err) {
        console.error(err);
        process.exit();
      }
    }
  } else if (args[0] == "--help" || args[0] == "-h") {
    console.info(
      `Get a Token using Authorization Code Flow
      
USAGE
  ${programName} [flags]
  
FLAGS
  -h, --help        Show help
  -c, --config      Provide a json file with the required credentials
  -v, --version     Show version

CONFIGURATION PARAMETERS
Following fields can be provided via a json property in a config file via --config (-c) argument or environment variables (config file values have higher precedence):
  AUTH_ENDPOINT (required)
  TOKEN_ENDPOINT (required)
  CLIENT_ID (required)
  CLIENT_SECRET (Optional)
  SCOPE (required)
  REDIRECT_URL (required)
  SPA (Optional)
  
NOTE
  The program will try to launch a server on localhost on the port provided in REDIRECT_URL. To login, please open http://localhost:(port in REDIRECT_URL) in a browser.
  `)
    process.exit();
  } else if (args[0] == "--version" || args[0] == "-v") {
    console.info(version);
    process.exit();
  }
}

function exitWithHelp(message) {
  console.error(`${message}

Run ${programName} --help to get more details.`)
  process.exit();
}

function ensureNotEmpty(name) {
  let val = config[name] || process.env[name] || "";
  if (val.trim() === "") {
    exitWithHelp(`${name} is required.`)
  }
  return val;
}

const authEndpoint = ensureNotEmpty("AUTH_ENDPOINT");
const tokenEndpoint = ensureNotEmpty("TOKEN_ENDPOINT");
const clientId = ensureNotEmpty("CLIENT_ID");
const clientSecret = process.env.CLIENT_SECRET || config.CLIENT_SECRET || "";
let scopes = ensureNotEmpty("SCOPE");
const scope = scopes.split(',').join(' ');;
var redirectUrl
try {
  redirectUrl = new URL(process.env.REDIRECT_URL || config.REDIRECT_URL);
} catch (error) {
  console.error(`Invalid REDIRECT_URL. ${error}`);
}
const isSPA = process.env.SPA === undefined ? config.SPA || false : process.env.SPA || false;

const crypto = require('crypto');
const { exit } = require('process');

function base64URLEncode(str) {
  return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
const codeChallengeMethod = 'S256';

let codeVerifier = '';
let codeChallenge = '';
let state = '';
let nonce = '';

function getIndexHtml() {
  codeVerifier = base64URLEncode(crypto.randomBytes(32));
  codeChallenge = base64URLEncode(crypto.createHash('sha256').update(codeVerifier).digest());
  state = crypto.randomBytes(22).toString('hex');
  nonce = crypto.randomBytes(22).toString('hex');

  const query = `client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${redirectUrl.href}&state=${state}&nonce=${nonce}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}`;
  const url = `${authEndpoint}?${encodeURI(query)}`;
  const index = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth 2.0 (Authorization Code flow with PKCE)</title>
</head>
<body style="margin: 0; padding: 0; background-color: #333333;">
  <div style="text-align: center;">
    <img  style="margin: 40px 0;" src="data:image/png;base64,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"/>
    <div style="display: table; margin: 0 auto;">
      <input id='signin' type=button onClick="location.href='${url}'" value='Sign in' style="height: 35px; width: 120px; font-size: 1em; font-family: sans-serif; cursor: pointer;">
    </div>
  </div>
  <div style="bottom: 0px;position: fixed;height: 28px;width: 100%;text-align: center;background-color: #232323;/* text-align: center; */line-height: 24px;">
    <a href="https://github.com/TqrHsn/oauth-code-token" style="color: white; font-size: 0.8em; font-family: sans-serif;">
      <span><svg viewBox="0 0 92 92" version="1.1" xmlns="http://www.w3.org/2000/svg" style="height: 14px; margin-right: 6px; transform: translateY(3px);"><g stroke="none" fill="white"><path d="M90.155,41.965 L50.036,1.847 C47.726,-0.464 43.979,-0.464 41.667,1.847 L33.336,10.179 L43.904,20.747 C46.36,19.917 49.176,20.474 51.133,22.431 C53.102,24.401 53.654,27.241 52.803,29.706 L62.989,39.891 C65.454,39.041 68.295,39.59 70.264,41.562 C73.014,44.311 73.014,48.768 70.264,51.519 C67.512,54.271 63.056,54.271 60.303,51.519 C58.235,49.449 57.723,46.409 58.772,43.861 L49.272,34.362 L49.272,59.358 C49.942,59.69 50.575,60.133 51.133,60.69 C53.883,63.44 53.883,67.896 51.133,70.65 C48.383,73.399 43.924,73.399 41.176,70.65 C38.426,67.896 38.426,63.44 41.176,60.69 C41.856,60.011 42.643,59.497 43.483,59.153 L43.483,33.925 C42.643,33.582 41.858,33.072 41.176,32.389 C39.093,30.307 38.592,27.249 39.661,24.691 L29.243,14.271 L1.733,41.779 C-0.578,44.092 -0.578,47.839 1.733,50.15 L41.854,90.268 C44.164,92.578 47.91,92.578 50.223,90.268 L90.155,50.336 C92.466,48.025 92.466,44.275 90.155,41.965"></path></g></svg></span><span>github.com/tqrhsn/oauth-code-token</span>
    </a>
  </div>
</body>
</html>
`;

  return index;
}

function getToken(code, onResult) {
  const https = require('https');
  const tokenUrl = new URL(tokenEndpoint);

  let postData = {
    'grant_type': 'authorization_code',
    'code': code,
    'client_id': clientId,
    'code_verifier': codeVerifier,
    'redirect_uri': redirectUrl.href
  };

  if (clientSecret != "") {
    postData.client_secret = clientSecret;
  }

  formEncoded = require('querystring').stringify(postData)

  const options = {
    method: 'POST',
    hostname: tokenUrl.hostname,
    path: tokenUrl.pathname,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': formEncoded.length
    },
    'maxRedirects': 3
  };

  if (isSPA) {
    options.headers.Origin = `${redirectUrl.protocol}://${redirectUrl.hostname}`; // For AzureAD SPA clients which require this to be present in request.
  }

  const request = https.request(options, function (response) {
    var chunks = [];

    response.on("data", function (chunk) {
      chunks.push(chunk);
    });

    response.on("end", function (_) {
      const body = Buffer.concat(chunks);
      if (onResult) {
        onResult(body.toString());
      }
    });

    response.on("error", function (error) {
      console.error(error);
      if (onResult) {
        onResult(`{${error}}`);
      }
    });
  });

  request.write(formEncoded);
  request.end();
}

var server = require('http').createServer(function (req, res) {
  if (req.url == '/') {
    res.end(getIndexHtml());
  } else if (req.url.startsWith(`${redirectUrl.pathname}?`)) {
    const searchParams = new URLSearchParams(req.url.split('?')[1]);
    const code = searchParams.get('code');
    const mState = searchParams.get('state');
    res.setHeader("Content-Type", "application/json");
    if (mState == state) {
      getToken(code, (body) => {
        res.end(body);
      });
    } else {
      res.end('{Error validating state. Possible CSRF.}');
    }
  }
});

server.listen(redirectUrl.port, () => {
  console.log(`Listening on port: ${redirectUrl.port}`);
  console.info(`Please open http://localhost:${redirectUrl.port} in a browser to retrieve token.`);
});