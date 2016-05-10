var express = require('express');
var router = express.Router();

var request = require('request');
var qs = require('querystring');
var User = require('../models/user');

//  auth.js
//  /auth  router

router.post('/login', (req, res) => {
  User.authenticate(req.body, (err, token) => {
    if(err) return res.status(400).send(err);

    res.cookie('accessToken', token).send(token);
  });
});

router.post('/signup', (req, res) => {
  User.register(req.body, (err, user) => {
    if(err) return res.status(400).send(err);

    var token = user.makeToken();
    res.send({ token: token });
  });
});


router.post('/google', (req, res) => {
  console.log('/auth/google');
  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: process.env.GOOGLE_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };
  console.log('params google: ', params);

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = { Authorization: 'Bearer ' + accessToken };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err, response, profile) {
      if (profile.error) {
        return res.status(500).send({message: profile.error.message});
      }
      // Step 3a. Link user accounts.
      if (req.header('Authorization')) {
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
          }
          var token = req.header('Authorization').split(' ')[1];
          var payload = jwt.decode(token, config.TOKEN_SECRET);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.google = profile.sub;
            user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
            user.displayName = user.displayName || profile.name;
            user.save(function() {
              var token = user.makeToken();
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.send({ token: existingUser.makeToken() });
          }
          var user = new User();
          user.google = profile.sub;
          user.picture = profile.picture.replace('sz=50', 'sz=200');
          user.displayName = profile.name;
          user.save(function(err) {
            var token = user.makeToken();
            res.send({ token: token });
          });
        });
      }
    });
  });
});

router.post('/github', (req, res) => {
  var accessTokenUrl = 'https://github.com/login/oauth/access_token';
  var userApiUrl = 'https://api.github.com/user';

  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: process.env.GITHUB_SECRET
  };

  // use code to request access token
  request.get({ url: accessTokenUrl, qs: params }, (err, response, body) => {
    if(err) return res.status(400).send(err);

    var accessToken = qs.parse(body);
    var headers = { 'User-Agent': 'satellizer' };

    //  use access token to request user profile
    request.get({ url: userApiUrl, qs: accessToken, headers: headers, json: true }, (err, response, profile) => {
      if(err) return res.status(400).send(err);

      User.findOne({ github: profile.id }, (err, existingUser) => {
        if(err) return res.status(400).send(err);

        if(existingUser) {
          var token = existingUser.makeToken();
          res.send({ token: token });

        } else {
          var user = new User();
          user.github = profile.id;

          user.save((err, savedUser) => {
            var token = savedUser.makeToken();
            res.send({ token: token });
          });
        }
      });
    });
  });
});


module.exports = router;
