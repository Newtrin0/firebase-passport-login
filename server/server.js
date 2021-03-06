var http = require('http');
var express = require('express');
var passport = require('passport');
var serverConfig = require('./config');
var TokenGenerator = require('firebase-token-generator');
var Firebase = require('firebase');
var app = express();

app.configure(function() {
  app.use(express.static('public'));
  app.use(express.cookieParser(serverConfig.COOKIE_SECRET));
  app.use(express.bodyParser());
  app.use(express.session({ secret: serverConfig.COOKIE_SECRET }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

var ref = new Firebase(serverConfig.FIREBASE_URL)
var tokGen = new FirebaseTokenGenerator(serverConfig.FIREBASE_SECRET)

ref.auth(serverConfig.FIREBASE_SECRET, function (err, data) {
    if (err) throw err;
    
    serverConfig.SERVICES.forEach(function (service) {
        var serviceObject = require('./services/' + service).setup(passport);
        
        app.get('/auth/' + service, function(req, res, next){
            res.cookie('passportAnonymous', req.query.oAuthTokenPath, {signed: true});
            passport.authenticate(service, serviceObject.options)(req, res, next);
        });

        app.get('/auth/' + service + '/callback', function (req, res, next) {
          passport.authenticate(service, function(err, user, info) {
                ref.child('oAuthToken').child(user.uid).set(user.accessToken)
                var tok = null;
                if( !err && user ) {
                    tok = tokGen.createToken(user);
                }
                ref.child(req.signedCookies.passportAnonymous).set(tok);
            })(req, res, next);
        });
    });

    app.listen(1337);
})