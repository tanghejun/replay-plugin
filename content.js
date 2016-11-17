var inited = false;
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if(message.from === 'popup') {
        if(message.subject === 'init') {
            if(!inited) {
                engine.init(message.data)
                inited = true;
            }
        }else if(message.subject === 'play') {
            engine.play()
        }else if(message.subject === 'pause') {
            engine.pause()
        }else if(message.subject === 'stop') {
            engine.stop()
        }
        sendResponse({status: true})
    }else {
        sendResponse({status: false})
    }
});