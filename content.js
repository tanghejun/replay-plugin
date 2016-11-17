chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if(message.from === 'popup') {
    	if(message.subject === 'init') {
    		engine.init(message.data)
    	}else if(message.subject === 'play') {
    		engine.play()
    	}else if(message.subject === 'pause') {
    		engine.pause()
    	}else if(message.subject === 'stop') {
    		engine.stop()
    	}
    }
});