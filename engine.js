var engine = (function() {
    console.log('replay engine loaded.');
    var API = {},
        _session = {},
        _mouseSvg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAQAAAAm93DmAAADJUlEQVRIx63Ve0hTURwH8LO7h7vbdU7nnNt8pDPcsKb9UWbPpSlLxF5UihkmA9GoKAsi8I/6o4xeGhFFL6xA6EHpH2XPP6wIgzCz3BopNIPeSIQFZX37LZUeRGx39xwunPM7Ox9+59xzzxiYtPXfQRalVKtYSCVEMHfCyWWSgiYrtjTmSQim6wLbsa86VTJwivJK4xygdnq8RKBTObCRYXM/ymMFaUDF07VJ1Dx9b9jNFBKAkxW+GivSqfO47X6eFKDc57EgE2YogBNHcyJfMuerMmMiHBAIxc416ZGBssmcrzIRNmTATgHXB9TPMkYIeleaaA9t9EykUF0AHpMQAegk0IgJSKMnBakUbO7GUhUfUYbxRAW5JFhhpHDnrcHiSMCKOCRTTYKFXosZ0TQQaL8+QzTYV6GnzIJcIhIoQyOUNITjexxiQM7J9a3Q/cwsyMXDgDjE0JD1K3asShZzDvm+GgEmqqNcLJ1HFWQ0WDiEzTlx4X8pem+zhigjYQbooaEvZny4vh9VanW4YLTvFE/LHF2qGvKxIe5nq/X+UAmThQVOEnwn1JRZHL1dFTHBsIwwJXjqMzzr6JwdHqj1HVZBBy0RsrHcZH/8aOTM/qxwlsx7mzjKZXzngtjUriPHdnVVv1jysfhbAp1QtJRlhA7K+jb9CkzrNb1jeOB+zs6ar+XeLL3j8W/tuOA/h0aXPTRQ4WS9C8e7y+9CebyO4erOlrHrgWOp6iKtK6XaVeIIDZRnK7oXjXaqPqGwVHiSFTti+/DOyetFfnrZ8p7yYLPsLRrmJTJ2W9vUyvBwfQMv9vqSPypjKO5FRYE1OG211l/NsOGa38A04jLk2tblvYbdPT5d99I+N6DEK/fMaFGXg0U/vBiukt/u6EtR5w4yXGw+z4v6k7JYMXdpwu8T803DRQIWvHhj5/QiwBQhP+2v3de9mlR/g2Ggdq1GBPivcsDR3cSwu73HwHhJQIv57abcLw68L8jWSwIy1rXwiJfh5t4WjURgXebgZYb5/d+ztXpJQIUqsO/64MA2zLEZJQEZO7Tic6VHJY+RaMlU5HTV/Pdg/wDEX1fdN0jfnwAAAABJRU5ErkJggg==",
        _mouseSize = "20px",
        _mouse = {},
        _clickPointSize = '10px',
        _context = {
            time: 0,
            index: 0,
            timer: null
        };

    function init(session) {
        prepareSession(session);
        _mouse = drawMouse();
        console.log('engine initialized');
        // should resize the window according to meta, but this functionality is limited in web pages.
    }

    function prepareSession(session) {
        checkSession(session);

        // resolve comma separated data into array
        var result = session.events.map(function(action) {
            var arr = action.split(',');
            // parse timeStamp
            arr[arr.length - 1] = parseInt(arr.last());
            // decode element selector for click/scroll data
            if (arr[0] === 'c' || (arr[0] === 's' && arr.length === 5)) {
                arr[3] = decodeURIComponent(escape(atob(arr[3])));
            }
            return arr;
        })
        session.events = result;

        // for unknown reason, when scroll with mousemove, there's some chance the latter event captured before the previous one. so order them by timeStamp before storing them.
        session.events.sort(function(a, b) {
            return a.last() - b.last();
        });

        _session = session;
    }

    function checkSession(s) {
        if (toString.call(s) !== '[object Object]') {
            throw 'session should be an object'
        }

        /* check meta/data/id */
        if (!s._id || !s.meta || !s.events) {
            throw "corrupted session data"
        }
        /* maybe more check later, like time sequence, data format */

    }

    function drawMouse() {
        var mouse = document.createElement('div')

        var pointer = document.createElement('div')
        pointer.style.position = "absolute";
        pointer.style.width = _mouseSize;
        pointer.style.height = _mouseSize;
        var image = new Image();
        image.src = _mouseSvg;
        pointer.style.backgroundImage = "url('" + image.src + "')";
        pointer.style.backgroundSize = _mouseSize;
        pointer.style.backgroundRepeat = 'no-repeat';
        pointer.style.backgroundPosition = '-1px 3px';

        var clickHinter = document.createElement('div');
        clickHinter.style.position = "absolute";
        clickHinter.style.left = "-5px";
        clickHinter.style.top = "-6px";
        clickHinter.style.width = _mouseSize;
        clickHinter.style.height = _mouseSize;
        clickHinter.style.borderRadius = '50%';
        clickHinter.style.backgroundColor = 'yellow';

        mouse.style.position = "absolute";
        mouse.style.zIndex = 9999998;
        mouse.style.left = "10px";
        mouse.style.top = "10px";

        mouse.appendChild(clickHinter);
        mouse.appendChild(pointer);
        window.document.body.appendChild(mouse);
        return mouse;
    }

    function pause() {
        if (_context.timer) {
            clearInterval(_context.timer);
        }
    }

    function stop() {
        if (_context.timer) {
            clearInterval(_context.timer);
        }
        resetContext();
        cleanDots();
    }

    function cleanDots() {
        var clickPointWrapper = window.document.getElementsByClassName('click-point-wrapper')
        if (clickPointWrapper.length) {
            window.document.body.removeChild(clickPointWrapper[0])
        }
    }

    function play(speed) {
        console.log('play called');
        var mySession = Object.assign({}, _session);
        speed = speed || 1;
        if (typeof speed !== 'number' || speed !== speed) {
            throw 'speed should be a number';
        }
        if (speed > 5 || speed < 0) {
            throw 'invalid speed number, (0,5)';
        }

        if (speed !== 1) {
            var data = mySession.events.map(function(eachEvent) {
                eachEvent[eachEvent.length - 1] /= speed;
                return eachEvent;
            })
            mySession.events = data;
        }

        // play logic
        var length = mySession.events.length;

        _context.timer = setInterval(function() {
            if (_context.index === length) {
                stop();
                return;
            }
            var eachEvent = mySession.events[_context.index];
            if (around(_context.time, eachEvent.last())) {
                if (eachEvent[0] === 'm') {
                    move(eachEvent);
                } else if (eachEvent[0] === 's') {
                    scroll(eachEvent, _context.index);

                } else if (eachEvent[0] === 'k') {
                    keypress(eachEvent, _context.index);

                } else if (eachEvent[0] === 'c') {
                    click(eachEvent);

                } else if (eachEvent[0] === 'i') {
                    input(eachEvent, _context.index);
                }
                _context.index++;
            }
            _context.time += 10;
        }, 10)
    }

    function resetContext() {
        _context.index = 0;
        _context.time = 0;
        _context.timer = null;
    }

    function around(now, t) {
        console.log('now', parseFloat(now / 1000));
        return Math.abs(now - t) <= 11;
    }

    function move(event) {
        _mouse.style.left = event[1] + 'px';
        _mouse.style.top = event[2] + 'px';
        console.log('move to ', event);
    }

    function scroll(event, index) {
        var lastScrollSelector = findLastScrollSelector(index);
        if (!lastScrollSelector) {
            console.error('scroll target not found');
        } else {
            if (lastScrollSelector === 'document') {
                window.scroll(event[1], event[2]);
                console.log('scroll document to', event);
            } else {
                var target = window.document.querySelector(lastScrollSelector);
                target.scrollLeft = event[1];
                target.scrollTop = event[2];
            }
            console.log('scroll to', target, event);
        }
    }

    function findLastScrollSelector(index) {
        var selector = null;
        for (var i = index; i >= 0; i--) {
            if (_session.events[i][0] === 's' && _session.events[i].length === 5) {
                selector = _session.events[i][3];
                break;
            }
        }
        return selector;
    }

    /* need index to search forward to find the input element */
    function input(event, index) {
        var inputElement = null;
        for (var i = index; i >= 0; i--) {
            if (_session.events[i][0] === 'c') {
                inputElement = window.document.querySelector(_session.events[i][3]);
                break;
            }
        }
        if (inputElement) {
            inputElement.value = event[1];
        }
    }


    function click(event) {
        // create clickPoint wrapper if there isnt one.
        var wrapper = window.document.getElementsByClassName('click-point-wrapper');
        if (wrapper.length === 0) {
            var wrapper = document.createElement('div');
            wrapper.className = "click-point-wrapper"
        } else {
            wrapper = wrapper[0];
        }
        // style checkPoint
        var clickPoint = document.createElement('div');
        clickPoint.style.position = "absolute";
        clickPoint.style.zIndex = 99999999;
        clickPoint.style.width = _clickPointSize;
        clickPoint.style.height = _clickPointSize;
        clickPoint.style.backgroundColor = "red";
        clickPoint.style.opacity = 0.6;
        clickPoint.style.borderRadius = "50%";
        clickPoint.style.left = event[1] + 'px';
        clickPoint.style.top = event[2] + 'px';
        clickPoint.className = "click-point";

        wrapper.appendChild(clickPoint);
        window.document.body.appendChild(wrapper);

        // simulate user click, focus and dispatch click event
        var clickTarget = window.document.querySelector(event[3]);
        if (clickTarget) {
            clickTarget.focus();

            // ele.click() fn only works for certain element types, like input
            clickTarget.click();
            if (clickTarget.nodeName === "LABEL" && clickTarget.attributes['for']) {
                window.document.getElementById(clickTarget.attributes['for'].nodeValue).focus()

            }
        } else {
            console.warn('clickTarget not found: ', clickTarget);
        }
        console.log('click at', event);

    }

    /* util */
    if (!Array.prototype.last) {
        Array.prototype.last = function() {
            return this[this.length - 1];
        };
    };

    if (!Object.assign) {
        Object.defineProperty(Object, 'assign', {
            enumerable: false,
            configurable: true,
            writable: true,
            value: function(target) {
                'use strict';
                if (target === undefined || target === null) {
                    throw new TypeError('Cannot convert first argument to object');
                }

                var to = Object(target);
                for (var i = 1; i < arguments.length; i++) {
                    var nextSource = arguments[i];
                    if (nextSource === undefined || nextSource === null) {
                        continue;
                    }
                    nextSource = Object(nextSource);

                    var keysArray = Object.keys(nextSource);
                    for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                        var nextKey = keysArray[nextIndex];
                        var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                        if (desc !== undefined && desc.enumerable) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
                return to;
            }
        });
    }

    API.init = init;
    API.play = play;
    API.pause = pause;
    API.stop = stop;

    return API;



})();
