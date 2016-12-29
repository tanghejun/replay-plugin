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
        _touchPoint,
        _context = {
            time: 0,
            index: 0,
            timer: null
        };

    function init(session) {
        _session = parse(session);
        console.log(_session);
        _touchPoint = drawTouchPoint();
        _mouse = drawMouse();
        if (isMobile(session.meta.ua)) {
            _mouse.style.opacity = 0;
        } else {
            _touchPoint.style.opacity = 0;
        }
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

            // replace idle time at the begining with 1s
            if(index === 0) {
                startTime = arr.last() - 1000
            }
            arr[arr.length -1] = arr.last() - startTime
            // decode element selector for click/scroll data
            if (arr[0] === 'c' || (arr[0] === 's' && arr.length === 5)) {
                arr[3] = decodeURIComponent(escape(atob(arr[3])));
            }
            return arr;
        });

        // filter out invalid event time
        session.events = session.events.filter(function(event) {
            return event.last() > 0;
        });

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

    function drawTouchPoint() {
        var dot = document.createElement('div')
        dot.style.position = "fixed"
        dot.style.width = '20px'
        dot.style.height = '20px'
        dot.style.borderRadius = '20px'
        dot.style.top = '10px'
        dot.style.left = '10px'
        dot.style.backgroundColor = '#aaa'
        dot.style.opacity = '0.5'
        dot.style.border = '1px solid #555'
        document.body.appendChild(dot)
        return dot;
    }

    function drawProgressBar(eventArr, curTime) {
        if(!_progressBar) {
            _progressBar = document.createElement('div')
            _progressBar.style.position = 'fixed'
            _progressBar.style.bottom = '0px'
            _progressBar.style.width = '90%'
            _progressBar.style.height = '10px'
            _progressBar.style.left = '50%'
            _progressBar.style.transform = 'translateX(-50%)'
            _progressBar.style.backgroundColor = '#eee'
            _progressBar.style.zIndex = '1000'
            document.body.appendChild(_progressBar)

            var timeLength = eventArr.last().last() - 0
            var progressBarLength = _progressBar.getBoundingClientRect().width;
            eventArr.forEach(function(event) {
                var eventDot = document.createElement('div')
                eventDot.style.position = 'absolute'
                eventDot.style.left = ( event.last() / timeLength * 100 ) + '%'
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
            _progressBar.appendChild(_progress)
        }
        var timeLength = eventArr.last().last() - 0
        var progressBarLength = _progressBar.getBoundingClientRect().width;
        _progress.style.width = 'calc(' + ( curTime / timeLength * 100) + '% + 3px)'
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
            if (_context.index >= eventLength) {
                if (_context.timer) {
                    clearInterval(_context.timer);
                }
                resetContext();
                showHint('done', 1000)
                return;
            }
            var curEvent = mySession.events[_context.index];

            while (closeEnough(_context.time, curEvent.last())) {
                if (curEvent[0] === 'm') {
                    move(curEvent);

                } else if (curEvent[0] === 's') {
                    scroll(curEvent, _context.index);

                } else if (curEvent[0] === 'c') {
                    click(curEvent);

                } else if (curEvent[0] === 'i') {
                    input(curEvent, _context.index);

                } else if (curEvent[0][0] === 't') {
                    touch(curEvent)
                }

                if(curEvent.jump) {
                    console.log('jump to: ', curEvent.jump);
                    var distance = Math.floor((curEvent.jump - _context.time) / 1000)
                    showHint('skip ' + distance + 's', 1000)
                    _context.time = curEvent.jump;
                }
                _context.index++;
                if(_context.index >= eventLength) {
                    break;
                }
                curEvent = mySession.events[_context.index];
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

    var lastSCrollSelector = '';
    function scroll(event, index) {
        if(event.length === 5) {
            lastScrollSelector = event[3]
        }
        if( !lastScrollSelector ) {
            console.error('scroll target not found')
        }
        if (lastScrollSelector === 'document') {
            window.scroll(event[1], event[2]);
        } else {
            var target = window.document.querySelector(lastScrollSelector);
            target.scrollLeft = event[1];
            target.scrollTop = event[2];
        }
        console.log('scroll to', lastScrollSelector, event);
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

    function touch(event) {
        if(event[0] === 'ts' || event[0] === 'tm') {
            _touchPoint.style.opacity = '1'
            _touchPoint.style.left = event[1] + 'px'
            _touchPoint.style.top = event[2] + 'px'
        } else if(event[0] === 'te') {
            _touchPoint.style.opacity = '0.5'
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

    function isMobile (ua) {
        var check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(ua);
        return check;
    }

    /* API */
    API.init = init;
    API.play = play;
    API.pause = pause;
    API.stop = stop;

    return API;



})();
