'use strict';

var app = angular.module('authApp', ['ui.router', 'satellizer']);

app.run(function(Auth) {
  Auth.getProfile();
});

app.config(function($stateProvider, $urlRouterProvider, $authProvider) {
  $authProvider.github({
    clientId: '1e7dddf5d9a122c09c6b'
  });
  $authProvider.google({
    clientId: '504246415487-3fsrmbkl2id2r0svfuotmrfv3q4bbe17.apps.googleusercontent.com'
  });

  $stateProvider
  .state('home', { url: '/', templateUrl: '/html/home.html', controller: 'homeCtrl' })
  .state('register', {
    url: '/register',
    templateUrl: '/html/authForm.html',
    controller: 'authFormCtrl'
  })
  .state('login', {
    url: '/login',
    templateUrl: '/html/authForm.html',
    controller: 'authFormCtrl'
  })
  .state('profile', {
    url: '/profile',
    templateUrl: '/html/profile.html',
    controller: 'profileCtrl',
    resolve: {
      profile: function(Auth, $q, $state) {
        return Auth.getProfile()
        .catch(() => {
          $state.go('home');
          return $q.reject();
        });
      }
    }
  })

  $urlRouterProvider.otherwise('/');
});

app.filter('titlecase', function() {
  return function(input) {
    return input[0].toUpperCase() + input.slice(1).toLowerCase();
  };
});
