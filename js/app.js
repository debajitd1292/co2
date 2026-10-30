/* ===== HEADER LOGO — NAVIGATE TO HOME ===== */

document.addEventListener("DOMContentLoaded", function () {
    const homeLogo = document.getElementById("homeLogo");

    if (!homeLogo) return;

    homeLogo.style.cursor = "pointer";

    homeLogo.addEventListener("click", function () {
        navigateToPage("home");
    });

    homeLogo.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigateToPage("home");
        }
    });
});
