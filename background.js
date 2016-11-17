function check(tabId, data, tab) {
    console.log(arguments);
    if (tab.url.indexOf('baixing') > -1 && tab.url.indexOf('replay_session_id') > -1) {
        chrome.pageAction.show(tabId)
    }
}
chrome.tabs.onUpdated.addListener(check)
