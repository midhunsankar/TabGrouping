
self.handler = function (windowId, tab, attempt = 0) {
    var host = new URL(tab.url).host;
    chrome.tabs.query({ windowId: windowId }, function (tabs) {
        if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError;
            if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                setTimeout(() => self.handler(windowId, tab, attempt + 1), 1000);
            } else {
                console.error(error);
                return;
            }
        }
        var filteredTabs = tabs.filter(t => new URL(t.url).host === host);
        if (filteredTabs.length > 2) {
            var tabIds = filteredTabs.map(t => t.id);
            //see if there is a group with the same host
            chrome.tabGroups.query({ title: host }, function (groups) {
                if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError;
                    if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                        setTimeout(() => self.handler(windowId, tab, attempt + 1), 1000);
                    } else {
                        console.error(error);
                        return;
                    }
                }
                if (groups.length == 0) {
                    //create a new group with the same host and add all the filtered tabs to it
                    chrome.tabs.group({ tabIds: tabIds }, function (newGroupId) {
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError;
                            if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                                setTimeout(() => self.handler(windowId, tab, attempt + 1), 1000);
                            } else {
                                console.error(error);
                                return;
                            }
                        }
                        chrome.tabGroups.update(
                            newGroupId,
                            {
                                title: host,
                                color: 'blue'
                            }
                        );
                    })
                } else {
                    //add all the filtered tabs to the existing group
                    chrome.tabs.group({ groupId: groups[0].id, tabIds: tabIds });
                }
            });
        } else {
            //ungroup the tabs
            filteredTabs.forEach(t => {
                chrome.tabs.ungroup(t.id);
            });
        }
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        if (tab.groupId !== -1) {
            return;
        }
        self.handler(tab.windowId, tab);
    }
});

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    var oldWindowId = detachInfo.oldWindowId;
    chrome.tabs.get(tabId, function (tab) {
        self.handler(oldWindowId, tab);
    });
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    var newWindowId = attachInfo.newWindowId;
    chrome.tabs.get(tabId, function (tab) {
        self.handler(newWindowId, tab);
    });
}); 