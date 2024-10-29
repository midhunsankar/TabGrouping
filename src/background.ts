
import { EventHandler } from './eventHandler';
import { Events } from './models/events.enum';
import { Settings } from './models/settings';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        if (tab.groupId !== -1) {
            return;
        }
        EventHandler.tabAction(Events.onUpdated, {
            windowId: tab.windowId,
            tab: tab,
            attempt: 0
        });
    }
});

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    var oldWindowId = detachInfo.oldWindowId;
    chrome.tabs.get(tabId, function (tab) {
        EventHandler.tabAction(Events.onDetached,
            {
                windowId: oldWindowId,
                tab: tab,
                attempt: 0
            });
    });
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    var newWindowId = attachInfo.newWindowId;
    chrome.tabs.get(tabId, function (tab) {
        EventHandler.tabAction(Events.onAttached,
            {
                windowId: newWindowId,
                tab: tab,
                attempt: 0
            });
    });
});

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== "tabGroupingExtension") {
        return;
    }
    port.onMessage.addListener(function(settings: Settings) {
        console.log(settings);
        EventHandler.updateSettings(settings);
    });
});

export { };