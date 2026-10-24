function initTheme() {
    
    const displayMode = document.getElementById("displayMode");

    if (!displayMode) return;

    // Load the previously saved theme
    const savedTheme = localStorage.getItem("theme") || "light";

    applyTheme(savedTheme);

    // Keep the selector synchronized with the active theme
    displayMode.value = savedTheme;

    // Apply the selected display mode
    displayMode.addEventListener("change", function () {
        applyTheme(this.value);
        localStorage.setItem("theme", this.value);
    });

    function applyTheme(theme) {
        document.body.classList.toggle("dark", theme === "dark");
    }
}
