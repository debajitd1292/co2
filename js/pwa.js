// ===============================
// PWA SERVICE WORKER
// ===============================

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js?v=1")
        .then(() => {
            console.log("Service Worker registered");
        })
        .catch(err => {
            console.error("Service Worker registration failed:", err);
        });
}


// ===============================
// AUTO REFRESH
// ===============================

setInterval(() => {
    if (document.visibilityState === "visible") {
        autoRefreshData();
    }
}, 2 * 60 * 1000);


document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        autoRefreshData();
    }
});
