const handler = {
    tabAction: function (windowId, tab, attempt = 0) {
        if (attempt > 1000) {
            console.log("Too many attempts to group the tabs");
            return;
        }
        var host = new URL(tab.url).host;
        chrome.tabs.query({ windowId: windowId }, function (tabs) {
            if (chrome.runtime.lastError) {
                const error = chrome.runtime.lastError;
                if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                    setTimeout(() => handler.tabAction(windowId, tab, attempt + 1), 1000);
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
                            setTimeout(() => handler.tabAction(windowId, tab, attempt + 1), 1000);
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
                                    setTimeout(() => handler.tabAction(windowId, tab, attempt + 1), 1000);
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
}

export { handler };