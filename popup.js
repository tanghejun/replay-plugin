angular.module('replay', [])
    .constant('API_HOST', 'http://d.admx.baixing.com:8885/')
    .controller('Ctrl', ['session', '$scope', function(session, $scope) {
        var ctrl = this;
        ctrl.disableBtn = true;
        ctrl.info = 'loading...'
        var currentTab = null;
        var currentSession = null;
        chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function(tabs) {
            currentTab = tabs[0]
            var sessionId = getParameterByName('replay_session_id', currentTab.url);

            session
                .get(sessionId)
                .then(function(data) {
                    ctrl.info = 'Session Loaded'
                    currentSession = data.data;
                    if (compareUrl(currentSession.meta.url, currentTab.url)) {
                        chrome.tabs.sendMessage(currentTab.id, { from: 'popup', subject: 'init', data: currentSession }, function(response) {
                            if (response.status) {
                                ctrl.info = 'Ready to roll'
                                ctrl.disableBtn = false;
                            } else {
                                ctrl.info = 'failt to send message'
                            }
                            $scope.$apply()
                        });
                    } else {
                        ctrl.info = "URL doesn't match"
                    }
                })
                .catch(function(err) {
                    ctrl.info = 'Tape not found'
                })
        });

        ctrl.play = function() {
            resizeWindow(currentSession, function() {
                chrome.tabs.sendMessage(currentTab.id, { from: 'popup', subject: 'play' }, function() {
                    window.close();
                });
            })
        }

        ctrl.pause = function() {
            chrome.tabs.sendMessage(currentTab.id, { from: 'popup', subject: 'pause' });
        }

        ctrl.stop = function() {
            chrome.tabs.sendMessage(currentTab.id, { from: 'popup', subject: 'stop' });
        }

        function resizeWindow(session, cb) {
            //set window size by meta.size
            chrome.windows.getCurrent(null, function(window) {
                var w = Number(session.meta.size.split(',')[0])
                var h = Number(session.meta.size.split(',')[1])
                chrome.windows.update(window.id, { width: w, height: h + 100 }, cb)
            })
        }

        // check if protocal://host/path match
        function compareUrl(url1, url2) {
            var l1 = getLocation(url1)
            var l2 = getLocation(url2)
            if (l1.protocal === l2.protocal && l1.host === l2.host && l1.path === l2.path) {
                return true;
            }
            return false;
        }

        var getLocation = function(href) {
            var l = document.createElement("a");
            l.href = href;
            return l;
        };

    }])
    .factory('session', ['$http', 'API_HOST', function($http, API_HOST) {
        return {
            get: function(id) {
                return $http.get(API_HOST + 'sessions/' + id)
            },
            query: function(query) {
                return $http.get(API_HOST + 'sessions')
            }

        }
    }])

//utils
function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
