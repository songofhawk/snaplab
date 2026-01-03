// Enable Side Panel on Action Click immediately
console.log("Background service worker started");

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed/updated");
    chrome.contextMenus.create({
        id: "editInAimage",
        title: "Edit in Aimage Partner",
        contexts: ["image"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "editInAimage" && info.srcUrl) {
        // In a real scenario, we might want to pass this URL to the popup.
        // However, opening the popup programmatically from background is restricted.
        // We can open a side panel (if perm enabled) or a new tab.
        // For now, let's just log it. Passing data to popup usually involves storage.
        chrome.storage.local.set({ pendingImage: info.srcUrl }, () => {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon-48.png',
                title: 'Image Selected',
                message: 'Click the extension icon to edit this image!'
            });
        });
    }
});
