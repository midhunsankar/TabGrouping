
import { handler } from './lib/handler.js';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        if (tab.groupId !== -1) {
            return;
        }
        handler.tabAction(tab.windowId, tab);
    }
});

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    var oldWindowId = detachInfo.oldWindowId;
    chrome.tabs.get(tabId, function (tab) {
        handler.tabAction(oldWindowId, tab);
    });
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    var newWindowId = attachInfo.newWindowId;
    chrome.tabs.get(tabId, function (tab) {
        handler(newWindowId, tab);
    });
});