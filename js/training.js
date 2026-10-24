let trainings = [];


function loadTrainingData(trainingText){

    if(!trainingText){
        trainings = [];
        return;
    }

    const trainingRows = parseCSV(trainingText);

    trainings = trainingRows
        .slice(1)
        .map(r => {
            return {
                date: r[0]?.trim(),
                name: r[1]?.trim(),
                type: r[2]?.trim()
            };
        })
        .filter(r => r.date);
}


function updateTrainingHeader(){

    let header = document.getElementById("trainingHeader");

    if(!header) return;

    let now = new Date();

    let month =
        now.toLocaleString("default", { month: "long" });

    let year =
        now.getFullYear();

    header.innerText =
        `Training Schedule for ${month} ${year}`;
}


function renderTraining(){

    let box =
        document.getElementById("trainingSection");

    if(!box) return;

    box.innerHTML = "";

    let refDate = new Date();

    let month =
        ("0" + (refDate.getMonth() + 1)).slice(-2);


    let filtered = trainings.filter(t => {

        if(!t.date) return false;

        let first =
            t.date.split("to")[0].trim();

        if(!first || !first.includes("-"))
            return false;

        let parts = first.split("-");

        if(parts.length < 2)
            return false;

        return String(parseInt(parts[1])) ===
               String(parseInt(month));

    });


    if(filtered.length === 0){

        box.innerHTML = `
        <div style="color:#777;font-weight:bold;">
            No training scheduled for the month yet
        </div>`;

        return;
    }


    filtered.sort((a,b) => {

        let da =
            a.date.split("to")[0].trim();

        let db =
            b.date.split("to")[0].trim();

        let [d1,m1] = da.split("-");
        let [d2,m2] = db.split("-");

        let year =
            new Date().getFullYear();

        return new Date(year, m1-1, d1) -
               new Date(year, m2-1, d2);

    });


    let today = new Date();

    today.setHours(0,0,0,0);


    filtered.forEach(t => {

        /* --- extract start & end date --- */

        let parts =
            t.date.split("to").map(x => x.trim());

        let [sd, sm] =
            parts[0].split("-");

        let startDate =
            new Date(
                today.getFullYear(),
                sm - 1,
                sd
            );


        let endDate = startDate;


        if(parts.length > 1){

            let [ed, em] =
                parts[1].split("-");

            endDate =
                new Date(
                    today.getFullYear(),
                    em - 1,
                    ed
                );
        }


        /* --- status check --- */

        let isPast =
            endDate < today;

        let isToday =
            startDate <= today &&
            endDate >= today;


        let extraClass = "";


        if(isPast){

            extraClass =
                "past-training";

        }else if(isToday){

            extraClass =
                "today-training";

        }else{

            extraClass =
                "upcoming-training";
        }


        box.innerHTML += `
        <div class="training-item ${extraClass}">

            <!-- Line 1 -->

            <div class="training-name" style="font-weight:bold;">

                ${isToday ? "🟢 " :
                  isPast ? "⚪ " : "🟡 "}

                ${t.date.split("to").map(d => {

                    const [day, month] =
                        d.trim().split("-");

                    const monthName =
                        new Date(
                            2000,
                            Number(month) - 1,
                            1
                        ).toLocaleString(
                            "en-US",
                            { month: "short" }
                        );

                    return `${day} ${monthName}`;

                }).join(" to ")}

                — ${t.name}

            </div>


            <!-- Line 2 -->

            <div class="training-type">
                ${t.type}
            </div>

        </div>
        `;
    });
}
