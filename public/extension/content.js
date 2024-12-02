chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  var port = chrome.runtime.connect({name: "tabGroupingExtension"});
  port.postMessage(request);
  sendResponse({ fromcontent: "Settings updated." });
});