'use strict';
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received", request, sender);
  sendResponse({ fromcontent: "This message is from content.js" });
});