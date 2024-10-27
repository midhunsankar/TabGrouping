chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received", request, sender);
  console.log(chrome.tabGroups);
  // chrome.tabs.query({ active: false, currentWindow: true }, function(tabs) {
  //   console.log("tabs", tabs);
  // });

  sendResponse({ fromcontent: "This message is from content.js" });
});