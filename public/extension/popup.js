const sendMessageId = document.getElementById("sendmessageid");
// Function to get a cookie value by name
function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

// Set itemCount value from cookie if available
var itemCount = document.getElementById("itemCount");
var cookieItemCount = getCookie("itemCount");
if (cookieItemCount) {
    itemCount.value = cookieItemCount;
} else if (!itemCount.value) {
    itemCount.value = "3";
    document.cookie = "itemCount=" + itemCount.value + "; path=/";
}


if (sendMessageId) {
    sendMessageId.onclick = function() {
        document.cookie = "itemCount=" + itemCount.value + "; path=/";
        const settings = { itemCount: itemCount.value };
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0].id !== undefined) {
                chrome.tabs.sendMessage(tabs[0].id, settings, function(response) {
                    console.log(response);
                });
            }
        });
    };
}