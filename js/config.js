const DATA_VERSION = Date.now();

const baseUrl = "https://raw.githubusercontent.com/debajitd1292/co2/main/";

const holidayUrl =
    baseUrl + "updates/holiday.csv?v=" + DATA_VERSION;

const notesUrl =
    baseUrl + "updates/notes.csv?v=" + DATA_VERSION;

const alertsUrl =
    baseUrl + "updates/alerts.csv?v=" + DATA_VERSION;

const trainingUrl =
    baseUrl + "updates/training.csv?v=" + DATA_VERSION;

const imsUrl =
    baseUrl + "updates/ims.csv?v=" + DATA_VERSION;

const productionPlanUrl =
    baseUrl + "production/production_plan.csv?v=" + DATA_VERSION;

const productionTargetUrl =
    baseUrl + "production/production_target.csv?v=" + DATA_VERSION;

const seniorityExecUrl =
    baseUrl + "seniority/seniority_exec.csv?v=" + DATA_VERSION;

const seniorityNonExecUrl =
    baseUrl + "seniority/seniority_nonexec.csv?v=" + DATA_VERSION;

/* =========================================
   DYNAMIC SHIFT MONTH URLS
   ========================================= */

let shiftUrlPrev = "";
let nonExecUrlPrev = "";

let shiftUrl = "";
let nonExecUrl = "";

let shiftUrlNext = "";
let nonExecUrlNext = "";

function updateShiftUrls(){

    const now = new Date();

    const month =
        String(now.getMonth() + 1).padStart(2, "0");

    const year =
        String(now.getFullYear()).slice(-2);

    const monthKey =
    month + year;


    /* PREVIOUS MONTH */

    const prevDate =
        new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        );

    const prevMonth =
        String(prevDate.getMonth() + 1).padStart(2, "0");

    const prevYear =
        String(prevDate.getFullYear()).slice(-2);

    const prevMonthKey =
        prevMonth + prevYear;


    /* NEXT MONTH */

    const nextDate =
        new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );

    const nextMonth =
        String(nextDate.getMonth() + 1).padStart(2, "0");

    const nextYear =
        String(nextDate.getFullYear()).slice(-2);

    const nextMonthKey =
        nextMonth + nextYear;


    /* PREVIOUS MONTH */

    shiftUrlPrev =
        baseUrl +
        "exec/shift_exec_" +
        prevMonthKey +
        ".csv?v=" +
        DATA_VERSION;

    nonExecUrlPrev =
        baseUrl +
        "nonexec/shift_nonexec_" +
        prevMonthKey +
        ".csv?v=" +
        DATA_VERSION;


    /* CURRENT MONTH */

    shiftUrl =
        baseUrl +
        "exec/shift_exec_" +
        monthKey +
        ".csv?v=" +
        DATA_VERSION;

    nonExecUrl =
        baseUrl +
        "nonexec/shift_nonexec_" +
        monthKey +
        ".csv?v=" +
        DATA_VERSION;

    shiftUrlNext =
        baseUrl +
        "exec/shift_exec_" +
        nextMonthKey +
        ".csv?v=" +
        DATA_VERSION;

    nonExecUrlNext =
        baseUrl +
        "nonexec/shift_nonexec_" +
        nextMonthKey +
        ".csv?v=" +
        DATA_VERSION;

}
