let alertsData = [];

function parseAlertDateTime(value){

    if(!value) return null;

    value = value.trim();

    let parts = value.split(/\s+/);

    if(parts.length < 2) return null;

    let datePart = parts[0];
    let timePart = parts[1];

    let [day, month, year] = datePart.split("-").map(Number);
    let [hour, minute] = timePart.split(":").map(Number);

    if(
        !day || !month || !year ||
        isNaN(hour) || isNaN(minute)
    ){
        return null;
    }

    return new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0
    );
}

function getActiveAlerts(){

    let now = new Date();

    let active = [];

    alertsData.forEach(a => {

        if(!a.from || !a.to || !a.text) return;

        let from = parseAlertDateTime(a.from);
        let to   = parseAlertDateTime(a.to);

        if(!from || !to) return;

        let repeat = (a.repeat || "once").trim().toLowerCase();

        if(repeat === "once"){

            if(now >= from && now <= to){
                active.push(a);
            }

            return;
        }


        if(now < from || now > to){
            return;
        }

        if(repeat === "month-end"){

            const currentMinutes =
                now.getHours() * 60 +
                now.getMinutes();

            const fromMinutes =
                from.getHours() * 60 +
                from.getMinutes();

            const toMinutes =
                to.getHours() * 60 +
                to.getMinutes();

            const lastDayOfMonth =
                new Date(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    0
                ).getDate();

            const isLastDay =
                now.getDate() === lastDayOfMonth;

            const isFirstDay =
                now.getDate() === 1;

            if(
                (isLastDay && currentMinutes >= fromMinutes) ||
                (isFirstDay && currentMinutes <= toMinutes)
            ){
                active.push(a);
            }

            return;
        }

        if(repeat === "daily"){

            let currentMinutes =
                now.getHours() * 60 +
                now.getMinutes();

            let fromMinutes =
                from.getHours() * 60 +
                from.getMinutes();

            let toMinutes =
                to.getHours() * 60 +
                to.getMinutes();

            if(
                currentMinutes >= fromMinutes &&
                currentMinutes <= toMinutes
            ){
                active.push(a);
            }

            return;
        }

        if(repeat === "weekly"){

            let currentDay = now.getDay();

            let currentMinutes =
                now.getHours() * 60 +
                now.getMinutes();

            let fromMinutes =
                from.getHours() * 60 +
                from.getMinutes();

            let toMinutes =
                to.getHours() * 60 +
                to.getMinutes();

            if(
                currentDay === from.getDay() &&
                currentMinutes >= fromMinutes &&
                currentMinutes <= toMinutes
            ){
                active.push(a);
            }

            return;
        }

        if(repeat === "monthly"){

            let currentMinutes =
                now.getHours() * 60 +
                now.getMinutes();

            let fromMinutes =
                from.getHours() * 60 +
                from.getMinutes();

            let toMinutes =
                to.getHours() * 60 +
                to.getMinutes();

            if(
                now.getDate() === from.getDate() &&
                currentMinutes >= fromMinutes &&
                currentMinutes <= toMinutes
            ){
                active.push(a);
            }

            return;
        }

        if(repeat === "yearly"){

            let currentMinutes =
                now.getHours() * 60 +
                now.getMinutes();

            let fromMinutes =
                from.getHours() * 60 +
                from.getMinutes();

            let toMinutes =
                to.getHours() * 60 +
                to.getMinutes();

            if(
                now.getMonth() === from.getMonth() &&
                now.getDate() === from.getDate() &&
                currentMinutes >= fromMinutes &&
                currentMinutes <= toMinutes
            ){
                active.push(a);
            }

            return;
        }

    });

    return active;
}

function loadAlerts(){

    fetchCSV(alertsUrl, true)

        .then(alertText => {

            if(!alertText){

                alertsData = [];

                renderAlerts();

                return;
            }

            const rows = parseCSV(alertText);

            if(!rows || rows.length < 2){

                alertsData = [];

                renderAlerts();

                return;
            }

            const header = rows[0].map(h =>
                h.trim().toLowerCase()
            );

            const fromIndex =
                header.indexOf("from date time");

            const toIndex =
                header.indexOf("to date time");

            const repeatIndex =
                header.indexOf("repeat");

            const textIndex =
                header.indexOf("alarm text");

            alertsData = rows
                .slice(1)
                .map(row => {

                    return {

                        from:
                            row[fromIndex]?.trim() || "",

                        to:
                            row[toIndex]?.trim() || "",

                        repeat:
                            row[repeatIndex]?.trim().toLowerCase() || "once",

                        text:
                            row[textIndex]?.trim() || ""

                    };

                })
                .filter(a =>
                    a.from &&
                    a.to &&
                    a.text
                );

            renderAlerts();

        })

        .catch(err => {

            console.warn(
                "Alert CSV load failed:",
                err
            );

            alertsData = [];

            renderAlerts();

        });
}

function renderAlerts(){

    let alertBox = document.getElementById("alertSection");

    if(!alertBox) return;

    let alerts = getActiveAlerts();

    if(alerts.length > 0){

        alertBox.innerHTML = `
            <div class="notice-alert">
                ${alerts.map(a => `
                    <div class="alert-item">${a.text}</div>
                `).join("")}
            </div>
        `;

        alertBox.style.display = "block";

    } else {

        alertBox.innerHTML = "";

        alertBox.style.display = "none";
    }
}