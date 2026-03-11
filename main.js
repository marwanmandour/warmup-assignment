const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
 function getShiftDuration(startTime, endTime){
    let [sh, sm] = startTime.split(":").map(Number);
    let [eh, em] = endTime.split(":").map(Number);

    let start = sh*60 + sm;
    let end = eh*60 + em;

    return end - start;
}


function getIdleTime(startTime,endTime){
    const START = 8*60;
    const END = 22*60;

    let [sh,sm] = startTime.split(":").map(Number);
    let [eh,em] = endTime.split(":").map(Number);

    let start = sh*60+sm;
    let end = eh*60+em;

    let idle = 0;

    if(start < START)
        idle += Math.min(end,START) - start;

    if(end > END)
        idle += end - Math.max(start,END);

    return idle;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration,idleTime){
    return shiftDuration - idleTime;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date,activeTime){

    let d = new Date(date);

    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");

    let quota = 504;

    if(d >= eidStart && d <= eidEnd)
        quota = 360;

    return activeTime >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
const fs = require("fs");

function addShiftRecord(textFile,shiftObj){

    let data = fs.readFileSync(textFile,"utf8");

    let lines = data.split("\n");

    // check duplicates
    for(let line of lines){
        if(line.includes(shiftObj.driverID) && line.includes(shiftObj.date))
            return false;
    }

    let duration = getShiftDuration(shiftObj.startTime,shiftObj.endTime);
    let idle = getIdleTime(shiftObj.startTime,shiftObj.endTime);
    let active = getActiveTime(duration,idle);
    let quota = metQuota(shiftObj.date,active);

    let record = `${shiftObj.driverID},${shiftObj.date},${shiftObj.startTime},${shiftObj.endTime},${duration},${idle},${active},${quota}`;

    fs.writeFileSync(textFile,data+"\n"+record);

    return true;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
