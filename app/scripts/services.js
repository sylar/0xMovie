/**
 * Created by Gabriel on 31/03/15.
 */

/*global define*/

define(['angular'], function (angular) {
    'use strict';
    return angular.module('MovieScribe.Services', [])
        .service('SessionService', ['$cookieStore', '$rootScope', function ($cookieStore, $rootScope) {
            var session = {
                userID: $cookieStore.get('userID'),
                authToken: $cookieStore.get('authToken'),
                firstName: $cookieStore.get('firstName'),
                lastName: $cookieStore.get('lastName'),
                email: $cookieStore.get('email')
            };

            return {
                createSession: function (userID, authToken, firstName, lastName, email) {
                    console.log("Create new session with userID: " + userID + ", authToken: " + authToken);

                    session.userID = userID;
                    session.authToken = authToken;
                    session.firstName = firstName;
                    session.lastName = lastName;
                    session.email = authToken;

                    // Write the current session in cookies
                    $cookieStore.put('userID', session.userID);
                    $cookieStore.put('authToken', session.authToken);
                    $cookieStore.put('firstName', session.firstName);
                    $cookieStore.put('lastName', session.lastName);
                    $cookieStore.put('email', session.email);

                    $rootScope.$broadcast('currentSessionUpdated');
                },
                destroyCurrentSession: function () {
                    console.log("Current session destroyed");

                    session.userID = null;
                    session.authToken = null;
                    session.firstName = null;
                    session.lastName = null;
                    session.email = null;

                    // Remove the user session from Cookies
                    $cookieStore.remove('userID');
                    $cookieStore.remove('authToken');
                    $cookieStore.remove('firstName');
                    $cookieStore.remove('lastName');
                    $cookieStore.remove('email');
                },
                getCurrentSession: function () {
                    if (session.userID) {
                        return session;
                    }
                    return null;
                }
            }
        }])
        .service('MovieScribeAPI', ['$http', '$rootScope', 'SessionService', function ($http, $rootScope, SessionService) {

            var moviescribeEndpoint = "http://52.16.207.87:8080/MovieScribe/";
            var currentSession = SessionService.getCurrentSession();

            $rootScope.$on('currentSessionUpdated', function () {
                currentSession = SessionService.getCurrentSession();
            });

            var service = {
                login: function (credentials) {
                    var url = moviescribeEndpoint + "login";
                    return $http({
                        method: 'POST',
                        url: url,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        transformRequest: function(obj) {
                            var str = [];
                            for(var p in obj)
                                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                            return str.join("&");
                        },
                        data: {email: credentials.email, password: credentials.password}
                    });
                },
                register: function (credentials) {
                    var url = moviescribeEndpoint + "register";
                    return $http({
                        method: 'POST',
                        url: url,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        transformRequest: function(obj) {
                            var str = [];
                            for(var p in obj)
                                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                            return str.join("&");
                        },
                        data: {
                            firstName: credentials.firstName,
                            lastName: credentials.lastName,
                            email: credentials.email,
                            password: credentials.password
                        }
                    });
                },
                getAllMovies: function () {
                    var url = moviescribeEndpoint + "movies";

                    console.log("URL getAllMovies", url);
                    return $http.get(url);
                },
                getLikedMovies: function () {
                    var url = moviescribeEndpoint + "likedmovies" +
                        "/" + currentSession.userID +
                        "/" + currentSession.authToken;

                    console.log("URL getLikedMovies", url);
                    return $http.get(url);
                },
                getCharts: function () {
                    var url = moviescribeEndpoint + "charts";

                    console.log("URL getCharts", url);
                    return $http.get(url);
                },
                likeMovie: function (movieID) {
                    var url = moviescribeEndpoint + "like" +
                        "/" + "" + // TODO: userID
                        "/" + "" + // TODO: authToken
                        "/" + movieID.toString();
                    return $http.get(url);
                }
            };

            return service;
        }])
        .service('AuthenticationService', ['$location', 'SessionService', 'MovieScribeAPI', function ($location, SessionService, MovieScribeAPI) {

            var currentSession = undefined;
            var service = {
                isUserAuthenticated: function () {
                    currentSession = SessionService.getCurrentSession();
                    return (currentSession) ? true : false;
                },
                register: function (credentials) {
                    // Make request to our API to send crendentials and get response
                    MovieScribeAPI.register(credentials).then(function (response) {
                        // Login
                        MovieScribeAPI.login(credentials).then(function (response) {
                            // Create new session (cookies)
                            SessionService.createSession(
                                response.data.userId,
                                response.data.authToken,
                                response.data.firstName,
                                response.data.lastName,
                                response.data.email
                            );

                            // Redirect to main page
                            $location.path('/');
                        });
                    });
                },
                login: function (credentials) {
                    // Make request to our API to send crendentials and get response
                    MovieScribeAPI.login(credentials).then(function (response) {
                        // Create new session (cookies)
                        SessionService.createSession(
                            response.data.userId,
                            response.data.authToken,
                            response.data.firstName,
                            response.data.lastName,
                            response.data.email
                        );

                        // Redirect to main page
                        $location.path('/');
                    });
                },
                logout: function () {
                    // Delete user data
                    SessionService.destroyCurrentSession();

                    // Send the user to the landing page
                    $location.path('/landingpage');
                }
            };
            return service;
        }])
        .factory('WebDatabase', ['$rootScope', 'MovieScribeAPI', function($rootScope, MovieScribeAPI) {

            var moviesList = undefined;
            var userLikedMovies = undefined;
            var charts = undefined;

            return {
                init: function () {
                    // Get all movies from eBooksManager API
                    MovieScribeAPI.getAllMovies().then(function (response) {
                        moviesList = response.data;
                        $rootScope.$broadcast('getAllMoviesDone');
                    });

                    // Get all movies the user liked
                    MovieScribeAPI.getLikedMovies().then(function (response) {
                        userLikedMovies = response.data;
                        $rootScope.$broadcast('getLikedMovies');
                    });

                    // Get charts
                    MovieScribeAPI.getCharts().then(function (response) {
                        charts = response.data;
                        $rootScope.$broadcast('getCharts');
                    });
                },
                getAllMovies: function () {
                    return moviesList;
                },
                getLikedMovies: function () {
                    return userLikedMovies;
                },
                getCharts: function () {
                    return charts;
                },
                likeMovie: function () {

                }
            }
        }])
});