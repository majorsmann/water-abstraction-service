// provides all API services consumed by VML and VML Admin front ends
require('dotenv').config();

const Hapi = require('hapi');
const cron = require('node-cron');

const serverOptions = { connections: { router: { stripTrailingSlash: true } } };
const server = new Hapi.Server(serverOptions);
const Helpers = require('./src/lib/helpers.js');
const messageQueue = require('./src/lib/message-queue');

server.connection({ port: process.env.PORT || 8001 });

if (process.env.DATABASE_URL) {
  // get heroku db params from env vars

  var workingVariable = process.env.DATABASE_URL.replace('postgres://', '');
  console.log(workingVariable);
  process.env.PGUSER = workingVariable.split('@')[0].split(':')[0];
  process.env.PGPASSWORD = workingVariable.split('@')[0].split(':')[1];
  process.env.PGHOST = workingVariable.split('@')[1].split(':')[0];
  process.env.PSPORT = workingVariable.split('@')[1].split(':')[1].split('/')[0];
  process.env.PGDATABASE = workingVariable.split('@')[1].split(':')[1].split('/')[1];
}

const cacheKey = process.env.cacheKey || 'super-secret-cookie-encryption-key';
console.log('Cache key' + cacheKey);
const sessionPluginOptions = {
  cache: { segment: 'unique-cache-sement' },
  cookie: { isSecure: false },
  key: 'bla-bla-bla'
};

// isSecure = true for live...
var yar_options = {
  storeBlank: false,
  cookieOptions: {
    password: 'the-password-must-be-at-least-32-characters-long',
    isSecure: false
  }
};

server.register([{
  register: require('yar'),
  options: yar_options
},

{
  register: require('node-hapi-airbrake-js'),
  options: {
    key: process.env.errbit_key,
    host: process.env.errbit_server
  }
}, {
  // Plugin to display the routes table to console at startup
  // See https://www.npmjs.com/package/blipp
  register: require('blipp'),
  options: {
    showAuth: true
  }
},
require('hapi-auth-basic'), require('hapi-auth-jwt2'), require('inert'), require('vision')
], (err) => {
  if (err) {
    throw err;
  }

  function validateBasic (request, user_name, password, callback) {
    // basic login for admin function UI

    console.log(user_name);
    console.log(password);

    var data = {};
    data.user_name = user_name;
    data.password = password;
    const httpRequest = require('request');

    var method = 'post';
    URI = process.env.IDM_URI + '/user/login';
    console.log(URI);
    httpRequest({
      method: method,
      url: URI + '?token=' + process.env.JWT_TOKEN,
      form: data
    },
    function (err, httpResponse, body) {
      console.log('got http ' + method + ' response');
      console.log(body);
      responseData = JSON.parse(body);
      if (responseData.err) {
        return callback(null, false);
      } else {
        callback(null, true, { id: responseData.user_id, name: data.user_name });
      }
    });
  }

  function validateJWT (decoded, request, callback) {
    // bring your own validation function
    // console.log(request.url.path)
    // console.log(request.payload)
    //  console.log('CALL WITH TOKEN')
    //  console.log(decoded)
    // TODO: JWT tokens to DB...
    // do your checks to see if the person is valid
    if (!decoded.id) {
      console.log('boo... JWT failed');
      return callback(null, false);
    } else {
      console.log('huzah... JWT OK');
      return callback(null, true);
    }
  }

  server.auth.strategy('simple', 'basic', { validateFunc: validateBasic });

  server.auth.strategy('jwt', 'jwt', {
    key: process.env.JWT_SECRET, // Never Share your secret key
    validateFunc: validateJWT, // validate function defined above
    verifyOptions: {}, // pick a strong algorithm
    verifyFunc: validateJWT
  });

  server.auth.default('jwt');

  // load views

  // load routes
  //  server.route(require('./src/routes/API'))
  server.route(require('./src/routes/water'));
});

async function start () {
  await messageQueue.start();

  // Register subscribers
  require('./src/subscribers')(messageQueue);

  server.start((err) => {
    if (err) {
      throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
  });
}

// Start the server if not testing with Lab
if (!module.parent) {
  start();
}

// Reset scheduler
// const taskRunner = require('./src/controllers/taskRunner');
// const path = require('path');
// const taskRunnerPath = path.resolve(__dirname, 'task-runner.js');
//
// async function startTaskRunner () {
//   console.log('Resetting task runner');
//   await taskRunner.reset();
//   cron.schedule('*/5 * * * * * *', function () {
//     const exec = require('child_process').exec;
//     const child = exec('node ' + taskRunnerPath);
//     child.stdout.on('data', function (data) {
//       console.log('taskRunner: ' + data);
//     });
//     child.stderr.on('data', function (data) {
//       console.log('taskRunner: ' + data);
//     });
//     child.on('close', function (code) {
//       const msg = `taskRunner: exited with code ${code}`;
//       const log = code === 0 ? console.log : console.error;
//       log(msg);
//     });
//   });
// }
//
// startTaskRunner();

module.exports = server;

// Small change
