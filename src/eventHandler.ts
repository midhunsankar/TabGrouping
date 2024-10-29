import { TabActionInput } from "./models/tabActionInput";
import { Settings } from "./models/settings";
import { Events } from "./models/events.enum";
class EventHandler {

    private static settings: Settings;

    public static async tabAction(event: Events, input: TabActionInput) {
        if(input.attempt > 1000) {
            console.log("Too many attempts to group the tabs");
            return;
        }

        switch (event) {
            case Events.onUpdated:
            case Events.onAttached:
                if (!(input.tab?.id) || !(input.tab?.url)) {
                    return;
                }
                 if (input.tab?.groupId === -1) {
                    // asign a group to the tab
                   await EventHandler.createOrUpdateGroup(input.tab?.id, new URL(input.tab.url).host);
                 }
                 if(!(await EventHandler.tabExistsInDB(input.tab.id))) {
                    await EventHandler.addTabToDB(input);
                 }
                break;
            case Events.onDetached:
                if (!(input.tab?.id) || !(input.tab?.url)) {
                    return;
                }
                if(!(await EventHandler.tabExistsInDB(input.tab.id))) {
                    await EventHandler.removeTabFromDB(input);
                }
                break;
            case Events.onRemoved:
                break;    
        }


        let host = input.tab?.url !== undefined ? new URL(input.tab.url).host : "";
        chrome.tabs.query({ windowId: input.windowId }, function (tabs) {
            if (chrome.runtime.lastError) {
                const error = chrome.runtime.lastError;
                if (error.message === "Tabs cannot be edited right now (user may be dragging a tab).") {
                    setTimeout(() => EventHandler.tabAction(event, input), 1000);
                } else {
                    console.error(error);
                    return;
                }
            }
            let filteredTabs = tabs.filter(t => t.url && new URL(t.url).host === host);
            if (filteredTabs.length > EventHandler.settings.itemCount) {
                let tabIds = filteredTabs.map(t => t.id).filter(id => id !== undefined) as number[];
                //see if there is a group with the same host
                chrome.tabGroups.query({ title: host }, function (groups) {
                    if (chrome.runtime.lastError) {
                        const error = chrome.runtime.lastError;
                        if (error.message  == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                            setTimeout(() => EventHandler.tabAction(event, input), 1000);
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
                                if (error.message  == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
                                    setTimeout(() => EventHandler.tabAction(event, input), 1000);
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
                    if (t.id !== undefined) {
                        chrome.tabs.ungroup(t.id);
                    }
                });
            }
        });
    }

    public static updateSettings(settings: Settings) {
        EventHandler.settings = settings;
    }

    private static createOrUpdateGroup(tabId: number, host: string): Promise<number> {
        return new Promise((resolve, reject) => {
            chrome.tabGroups.query({ title: host }, function (groups) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                if (groups.length > 0) {
                    resolve(chrome.tabs.group({ groupId: groups[0].id, tabIds: tabId }));    
                }
                else{
                    chrome.tabs.group({ tabIds: tabId }, function (newGroupId) {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        }
                        chrome.tabGroups.update(
                            newGroupId,
                            {
                                title: host,
                                color: 'blue'
                            }
                        ).then(() => resolve(newGroupId));
                    });
                }
            });
        });
    }

    private static dbInit(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("TabGroupingExtensionDB", 1);
            request.onupgradeneeded = function (event) {
                const db = request.result;
                const objectStore = db.createObjectStore("tabsCollection", { keyPath: "tabId" });
                objectStore.createIndex("windowId", "windowId", { unique: false });
                objectStore.createIndex("groupId", "groupId", { unique: false });
                objectStore.createIndex("url", "url", { unique: false });
            };
            request.onsuccess = function (event) {
                resolve(request.result);
            };
            request.onerror = function (event) {
                console.error("Database error: " + request.error);
                reject(request.error);
            };
        });
    }

    private static async addTabToDB(tabDetails: TabActionInput): Promise<void> {
        const db = await EventHandler.dbInit();
        const transaction = db.transaction("tabsCollection", "readwrite");
        const objectStore = transaction.objectStore("tabsCollection");
        objectStore.add({
            tabId: tabDetails.tab.id,
            windowId: tabDetails.windowId,
            groupId: tabDetails.tab.groupId,
            url: tabDetails.tab.url
        });
        await transaction.commit();
        await db.close();
    }

    private static async removeTabFromDB(tabDetails: TabActionInput): Promise<void> {
        if (tabDetails.tab?.id === undefined) {
            return;
        }
        const db = await EventHandler.dbInit();
        const transaction = db.transaction("tabsCollection", "readwrite");
        const objectStore = transaction.objectStore("tabsCollection");
        objectStore.delete(tabDetails.tab.id).result;
        await transaction.commit();
        await db.close();
    }

    private static async getAllTabsFromDBbyWindow(windowId: number): Promise<chrome.tabs.Tab[]> {
        const db = await EventHandler.dbInit();
        const transaction = db.transaction("tabsCollection", "readonly");
        const objectStore = transaction.objectStore("tabsCollection");
        const index = objectStore.index("windowId");
        const request = await index.getAll(windowId).result;
        await transaction.commit();
        await db.close();
        if(request === undefined) {
            return [];
        }
        return request.map(r => {
            return {
                id: r.tabId,
                groupId: r.groupId,
                url: r.url
            } as chrome.tabs.Tab;
        });
    }

    private static async tabExistsInDB(tabId: number): Promise<boolean> {
        const db = await EventHandler.dbInit();
        const transaction = db.transaction("tabsCollection", "readonly");
        const objectStore = transaction.objectStore("tabsCollection");
        const request = await objectStore.get(tabId).result;
        await db.close();
        return request !== undefined;
    }

}

export { EventHandler };