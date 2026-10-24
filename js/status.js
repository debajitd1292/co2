function updateHeaderDate() {
    
    const dateElem = document.getElementById("todayDate");
    if (!dateElem) return;

    const now = new Date();

    const weekday = now.toLocaleDateString("en-GB", {
        weekday: "long"
    });

    const day = now.getDate();
    const suffix = (day % 100 >= 11 && day % 100 <= 13)
        ? "th"
        : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th");

    const month = now.toLocaleDateString("en-GB", {
        month: "long"
    });

    const year = now.getFullYear();

    dateElem.innerHTML = `
        <div class="header-date">${weekday}, ${day}${suffix} ${month} ${year}</div>
    `;

    const dateText = dateElem.querySelector(".header-date");

    if (dateText) {
        if (isSpecialDay()) {
            dateText.style.color = "#ffd600";
        } else {
            dateText.style.color = "";
        }
    }
}


function getCurrentShiftInfo() {

    let now = new Date();

    let hours = now.getHours();

    let currentDate = formatDate(now);

    // previous date
    let prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    let prevDate = formatDate(prev);

    // A Shift: 06:00–14:00
    if(hours >= 6 && hours < 14){
        return { shift: "A", date: currentDate };
    }

    // B Shift: 14:00–22:00
    if(hours >= 14 && hours < 22){
        return { shift: "B", date: currentDate };
    }

    // C Shift split logic
    if(hours >= 22){
        // same day C
        return { shift: "C", date: currentDate };
    }

    if(hours < 6){
        // 🔴 IMPORTANT: after midnight → previous date C shift
        return { shift: "C", date: prevDate };
    }

    return null;
}
