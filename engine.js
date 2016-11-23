var engine = (function() {
    console.log('replay engine loaded.');
    var API = {},
        _session = {},
        _mouseSvg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAQAAAAm93DmAAADJUlEQVRIx63Ve0hTURwH8LO7h7vbdU7nnNt8pDPcsKb9UWbPpSlLxF5UihkmA9GoKAsi8I/6o4xeGhFFL6xA6EHpH2XPP6wIgzCz3BopNIPeSIQFZX37LZUeRGx39xwunPM7Ox9+59xzzxiYtPXfQRalVKtYSCVEMHfCyWWSgiYrtjTmSQim6wLbsa86VTJwivJK4xygdnq8RKBTObCRYXM/ymMFaUDF07VJ1Dx9b9jNFBKAkxW+GivSqfO47X6eFKDc57EgE2YogBNHcyJfMuerMmMiHBAIxc416ZGBssmcrzIRNmTATgHXB9TPMkYIeleaaA9t9EykUF0AHpMQAegk0IgJSKMnBakUbO7GUhUfUYbxRAW5JFhhpHDnrcHiSMCKOCRTTYKFXosZ0TQQaL8+QzTYV6GnzIJcIhIoQyOUNITjexxiQM7J9a3Q/cwsyMXDgDjE0JD1K3asShZzDvm+GgEmqqNcLJ1HFWQ0WDiEzTlx4X8pem+zhigjYQbooaEvZny4vh9VanW4YLTvFE/LHF2qGvKxIe5nq/X+UAmThQVOEnwn1JRZHL1dFTHBsIwwJXjqMzzr6JwdHqj1HVZBBy0RsrHcZH/8aOTM/qxwlsx7mzjKZXzngtjUriPHdnVVv1jysfhbAp1QtJRlhA7K+jb9CkzrNb1jeOB+zs6ar+XeLL3j8W/tuOA/h0aXPTRQ4WS9C8e7y+9CebyO4erOlrHrgWOp6iKtK6XaVeIIDZRnK7oXjXaqPqGwVHiSFTti+/DOyetFfnrZ8p7yYLPsLRrmJTJ2W9vUyvBwfQMv9vqSPypjKO5FRYE1OG211l/NsOGa38A04jLk2tblvYbdPT5d99I+N6DEK/fMaFGXg0U/vBiukt/u6EtR5w4yXGw+z4v6k7JYMXdpwu8T803DRQIWvHhj5/QiwBQhP+2v3de9mlR/g2Ggdq1GBPivcsDR3cSwu73HwHhJQIv57abcLw68L8jWSwIy1rXwiJfh5t4WjURgXebgZYb5/d+ztXpJQIUqsO/64MA2zLEZJQEZO7Tic6VHJY+RaMlU5HTV/Pdg/wDEX1fdN0jfnwAAAABJRU5ErkJggg==",
        _mouseSize = "20px",
        _mouse = {},
        _clickPointSize = '10px',
        _progressBar,
        _progress,
        _context = {
            time: 0,
            index: 0,
            timer: null
        };

    function init(session) {
        _session = parse(session);
        console.log(_session);
        _mouse = drawMouse();
        _progressBar = drawProgressBar(_session.events, 0);
        console.info('session loaded into engine');
        // should resize the window according to meta, but this functionality is limited in web pages.
    }

    function parse(session) {
        checkSession(session);

        // resolve comma separated data into array
        var startTime = 0
        session.events = session.events.map(function(action, index) {
            var arr = action.split(',');
            // parse timeStamp
            arr[arr.length - 1] = parseInt(arr.last());

            // strip idle time at the begining
            if(index === 0) {
                startTime = arr.last()
            } else {
                arr[arr.length -1] = arr.last() - startTime
            }
            // decode element selector for click/scroll data
            if (arr[0] === 'c' || (arr[0] === 's' && arr.length === 5)) {
                arr[3] = decodeURIComponent(escape(atob(arr[3])));
            }
            return arr;
        })

        // when scroll with mousemove, there's chance latter event captured before the previous one.
        // so order them by timeStamp before storing them.
        session.events.sort(function(a, b) {
            return a.last() - b.last();
        });

        // filter out timespan when user has no interaction at all
        var lastEvent = []
        var events = session.events;
        for(var i=0; i<events.length; i++) {
            if( i === 0 ) {
                lastEvent = events[i]
                continue;
            }
            if( events[i].last() - lastEvent.last() > 5000) {
                lastEvent.jump = events[i].last() - 1000
            }
            events[i - 1] = lastEvent.clone();
            lastEvent = events[i]
        }
        return session;
    }

    function checkSession(session) {
        if (toString.call(session) !== '[object Object]') {
            throw new Error('session should be an object')
        }

        /* check meta/data/id */
        if (!session._id || !session.meta || !session.events) {
            throw new Error("corrupted session data")
        }
         // maybe more check later, like time sequence, data format

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

    function drawProgressBar(eventArr, curTime) {
        if(!_progressBar) {
            _progressBar = document.createElement('div')
            _progressBar.style.position = 'fixed'
            _progressBar.style.bottom = '0px'
            _progressBar.style.width = '100%'
            _progressBar.style.height = '10px'
            _progressBar.style.backgroundColor = '#eee'
            // _progressBar.style.opacity = '0.4'
            _progressBar.style.zIndex = '1000'
            document.body.appendChild(_progressBar)

            var timeLength = eventArr.last().last() - 0
            var progressBarLength = _progressBar.getBoundingClientRect().width;
            eventArr.forEach(function(event) {
                var eventDot = document.createElement('div')
                eventDot.style.position = 'absolute'
                eventDot.style.left = ( event.last() / timeLength ) * progressBarLength + 'px'
                if(event[0] === 'c') {
                    eventDot.style.backgroundColor = '#F44336'
                    eventDot.title ='click'
                } else if(event[0] === 's') {
                    eventDot.style.backgroundColor = '#4CAF50'
                    eventDot.title ='scroll'
                } else if(event[0] === 'm') {
                    eventDot.style.backgroundColor = '#9E9E9E'
                    eventDot.title ='move'
                } else if(event[0] === 'i') {
                    eventDot.style.backgroundColor = '#2962FF'
                    eventDot.title ='input'
                }
                eventDot.style.width = '3px'
                eventDot.style.height = '10px'
                // eventDot.style.borderRadius = '50%'
                _progressBar.appendChild(eventDot)
            })
        }

        if(!_progress) {
            _progress = document.createElement('div')
            _progress.id = 'progress'
            _progress.style.position = 'fixed'
            _progress.style.bottom = '10px'
            _progress.style.height = '3px'
            _progress.style.width = '0'
            _progress.style.backgroundColor = 'red'
            _progress.style.zIndex = '999'
            document.body.appendChild(_progress)
        }
        var timeLength = eventArr.last().last() - 0
        var progressBarLength = _progressBar.getBoundingClientRect().width;
        _progress.style.width = curTime / timeLength * progressBarLength + 'px'
    }

    // controlls
    function play(speed) {
        if(_context.timer) {
            console.log('already playing');
            return;
        }
        console.log('play called');
        // var mySession = Object.assign({}, _session);
        var mySession = _session.clone();
        console.log(mySession.events[0]);
        speed = speed || 1;
        if (typeof speed !== 'number' || speed !== speed) {
            throw 'speed should be a number';
        }
        if (speed > 5 || speed < 0) {
            throw 'invalid speed number, (0,5)';
        }

        // speep up time
        if (speed !== 1) {
            mySession.events = mySession.events.map(function(eachEvent) {
                eachEvent[eachEvent.length - 1] /= speed;
                return eachEvent;
            })
        }

        // play logic
        var eventLength = mySession.events.length;

        _context.timer = setInterval(function tick() {
            // console.log('now', parseFloat(_context.time / 1000));
            console.log(_context.index);
            if (_context.index >= eventLength) {
                if (_context.timer) {
                    clearInterval(_context.timer);
                }
                resetContext();
                showHint('done', 1000)
                return;
            }
            var curEvent = mySession.events[_context.index];

            if (closeEnough(_context.time, curEvent.last())) {
                if (curEvent[0] === 'm') {
                    move(curEvent);

                } else if (curEvent[0] === 's') {
                    scroll(curEvent, _context.index);

                } else if (curEvent[0] === 'k') {
                    keypress(curEvent, _context.index);

                } else if (curEvent[0] === 'c') {
                    click(curEvent);

                } else if (curEvent[0] === 'i') {
                    input(curEvent, _context.index);

                }

                if(curEvent.jump) {
                    console.log('jump to: ', curEvent.jump);
                    showHint('skip blank...')
                    _context.time = curEvent.jump;
                }
                _context.index++;
            }
            _context.time += 10;
            drawProgressBar(_session.events, _context.time * speed)
        }, 10)
    }

    var _hint;
    function showHint(text, last) {
        if( !_hint ) {
            _hint = document.createElement('div')
            _hint.style.position = 'fixed'
            _hint.style.left = '50%'
            _hint.style.transform = 'translateX(-50%)'
            _hint.style.bottom = '50px'
            _hint.style.width = '120px'
            _hint.style.height = '20px'
            _hint.style.padding = '5px'
            _hint.style.textAlign = 'center'
            _hint.style.backgroundColor = '#888'
            _hint.style.color = 'white'
            _hint.style.zIndex = '10000'
            _hint.style.borderRadius = '4px'
            document.body.appendChild(_hint)
        }
        _hint.innerText = text
        _hint.style.opacity = '1'
        _hint.style.transition = 'opacity 0.2s'
        setTimeout(function() {
            hideHint()
        }, last || 500)
    }

    function hideHint() {
        if(_hint) {
            _hint.style.opacity = '0'
        }
    }

    function pause() {
        showHint('paused', 1000)
        if (_context.timer) {
            clearInterval(_context.timer);
            _context.timer = null;
        }
    }

    function stop() {
        showHint('screen cleaned', 1000)
        if (_context.timer) {
            clearInterval(_context.timer);
        }
        resetContext();
        cleanDots();
        _progress.style.width = 0;
        _mouse.style.left = '10px'
        _mouse.style.top = '10px'
    }

    function cleanDots() {
        var clickPointWrapper = window.document.getElementsByClassName('click-point-wrapper')
        if (clickPointWrapper.length) {
            window.document.body.removeChild(clickPointWrapper[0])
        }
    }

    function resetContext() {
        _context.index = 0;
        _context.time = 0;
        _context.timer = null;
    }

    function closeEnough(now, t) {
        return Math.abs(now - t) <= 11;
    }

    // simulate user events
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



    /* util */
    if (!Array.prototype.last) {
        Array.prototype.last = function() {
            return this[this.length - 1];
        };
    };

    Object.prototype.clone = function() {
      var newObj = (this instanceof Array) ? [] : {};
      for (var i in this) {
        if (i == 'clone') continue;
        if (this[i] && typeof this[i] == "object") {
          newObj[i] = this[i].clone();
        } else newObj[i] = this[i]
      } return newObj;
    }

    API.init = init;
    API.play = play;
    API.pause = pause;
    API.stop = stop;

    return API;



})();
