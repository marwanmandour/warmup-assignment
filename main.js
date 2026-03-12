const fs = require("fs");

// ============================================================
// Helper Functions
// ============================================================

function timeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function secondsToTimeHHH(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(3, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr) {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    let totalHours = hours;
    
    if (period === 'pm' && hours !== 12) {
        totalHours += 12;
    } else if (period === 'am' && hours === 12) {
        totalHours = 0;
    }
    
    return totalHours * 3600 + minutes * 60 + seconds;
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// ============================================================
function getShiftDuration(startTime, endTime) {
    const startSeconds = parseTimeToSeconds(startTime);
    const endSeconds = parseTimeToSeconds(endTime);
    let diff = endSeconds - startSeconds;
    
    if (diff < 0) {
        diff += 24 * 3600;
    }
    
    return secondsToTime(diff);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// ============================================================
function getIdleTime(startTime, endTime) {
    const startSeconds = parseTimeToSeconds(startTime);
    const endSeconds = parseTimeToSeconds(endTime);
    
    let actualEndSeconds = endSeconds;
    if (endSeconds <= startSeconds) {
        actualEndSeconds += 24 * 3600;
    }
    
    const EIGHT_AM = 8 * 3600;
    const TEN_PM = 22 * 3600;
    
    let idleSeconds = 0;
    
    for (let t = startSeconds; t < actualEndSeconds; t++) {
        const timeOfDay = t % (24 * 3600);
        if (timeOfDay < EIGHT_AM || timeOfDay >= TEN_PM) {
            idleSeconds++;
        }
    }
    
    return secondsToTime(idleSeconds);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const durationSeconds = timeToSeconds(shiftDuration);
    const idleSeconds = timeToSeconds(idleTime);
    const activeSeconds = Math.max(0, durationSeconds - idleSeconds);
    return secondsToTime(activeSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// ============================================================
function metQuota(date, activeTime) {
    const activeSeconds = timeToSeconds(activeTime);
    const [year, month, day] = date.split('-').map(Number);
    
    const isEidPeriod = (year === 2025 && month === 4 && day >= 10 && day <= 30);
    const NORMAL_QUOTA = 8 * 3600 + 24 * 60;
    const EID_QUOTA = 6 * 3600;
    
    return activeSeconds >= (isEidPeriod ? EID_QUOTA : NORMAL_QUOTA);
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    if (!shiftObj || !shiftObj.driverID || !shiftObj.driverName || 
        !shiftObj.date || !shiftObj.startTime || !shiftObj.endTime) {
        return {};
    }
    
    let content;
    try {
        content = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return {};
    }
    
    const lines = content.trim().split('\n');
    const header = lines[0];
    const records = lines.slice(1).filter(line => line.trim() !== '');
    
    // Check for duplicate
    for (const record of records) {
        const fields = record.split(',');
        if (fields[0] === shiftObj.driverID && fields[2] === shiftObj.date) {
            return {};
        }
    }
    
    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const metQuotaValue = metQuota(shiftObj.date, activeTime);
    const hasBonus = false;
    
    const newRecordFields = [
        shiftObj.driverID,
        shiftObj.driverName,
        shiftObj.date,
        shiftObj.startTime,
        shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuotaValue,
        hasBonus
    ];
    
    const newRecord = newRecordFields.join(',');
    
    // Check if driverID exists
    let driverExists = false;
    let lastDriverIndex = -1;
    
    for (let i = 0; i < records.length; i++) {
        const fields = records[i].split(',');
        if (fields[0] === shiftObj.driverID) {
            driverExists = true;
            lastDriverIndex = i;
        }
    }
    
    if (driverExists) {
        // Insert after the last record of this driver
        records.splice(lastDriverIndex + 1, 0, newRecord);
    } else {
        // Append at the end
        records.push(newRecord);
    }
    
    const newContent = header + '\n' + records.join('\n') + '\n';
    fs.writeFileSync(textFile, newContent);
    
    return {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuotaValue,
        hasBonus: hasBonus
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let content;
    try {
        content = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return;
    }
    
    const lines = content.trim().split('\n');
    const header = lines[0];
    const records = lines.slice(1);
    
    const updatedRecords = records.map(record => {
        const fields = record.split(',');
        if (fields[0] === driverID && fields[2] === date) {
            fields[9] = newValue.toString();
            return fields.join(',');
        }
        return record;
    });
    
    const newContent = header + '\n' + updatedRecords.join('\n') + '\n';
    fs.writeFileSync(textFile, newContent);
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let content;
    try {
        content = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return -1;
    }
    
    const lines = content.trim().split('\n');
    const records = lines.slice(1);
    
    let driverExists = false;
    let bonusCount = 0;
    const targetMonth = month.toString().padStart(2, '0');
    
    for (const record of records) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            driverExists = true;
            const recordMonth = fields[2].split('-')[1];
            if (recordMonth === targetMonth && fields[9] === 'true') {
                bonusCount++;
            }
        }
    }
    
    return driverExists ? bonusCount : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let content;
    try {
        content = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return "000:00:00";
    }
    
    const lines = content.trim().split('\n');
    const records = lines.slice(1);
    
    let totalSeconds = 0;
    const targetMonth = month.toString().padStart(2, '0');
    
    for (const record of records) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            const recordMonth = fields[2].split('-')[1];
            if (recordMonth === targetMonth) {
                totalSeconds += timeToSeconds(fields[7]);
            }
        }
    }
    
    return secondsToTimeHHH(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // Read driver rates to get day off
    let rateContent;
    try {
        rateContent = fs.readFileSync(rateFile, 'utf8');
    } catch (err) {
        return "000:00:00";
    }
    
    const rateLines = rateContent.trim().split('\n');
    const rateRecords = rateLines.slice(1);
    
    let dayOff = null;
    for (const record of rateRecords) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            dayOff = fields[1].trim().toLowerCase();
            break;
        }
    }
    
    if (!dayOff) {
        return "000:00:00";
    }
    
    const targetMonth = parseInt(month);
    const year = 2025;
    const daysInMonth = new Date(year, targetMonth, 0).getDate();
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    let totalRequiredSeconds = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, targetMonth - 1, day);
        const dayName = dayNames[date.getDay()];
        
        if (dayName === dayOff) continue;
        
        const isEid = (targetMonth === 4 && day >= 10 && day <= 30);
        
        if (isEid) {
            totalRequiredSeconds += 6 * 3600;
        } else {
            totalRequiredSeconds += 8 * 3600 + 24 * 60;
        }
    }
    
    // Subtract 2 hours per bonus
    const bonusSeconds = bonusCount * 2 * 3600;
    totalRequiredSeconds = Math.max(0, totalRequiredSeconds - bonusSeconds);
    
    return secondsToTimeHHH(totalRequiredSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // Read driver rates
    let rateContent;
    try {
        rateContent = fs.readFileSync(rateFile, 'utf8');
    } catch (err) {
        return 0;
    }
    
    const rateLines = rateContent.trim().split('\n');
    const rateRecords = rateLines.slice(1);
    
    let basePay = 0;
    let tier = 0;
    
    for (const record of rateRecords) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            basePay = parseInt(fields[2], 10);
            tier = parseInt(fields[3], 10);
            break;
        }
    }
    
    if (basePay === 0) return 0;
    
    const actualSeconds = timeToSeconds(actualHours);
    const requiredSeconds = timeToSeconds(requiredHours);
    
    // If actual >= required, no deduction
    if (actualSeconds >= requiredSeconds) {
        return basePay;
    }
    
    // Calculate missing hours
    const missingSeconds = requiredSeconds - actualSeconds;
    const missingHoursTotal = missingSeconds / 3600;
    
    // Allowed missing hours based on tier
    const allowedMissing = {
        1: 50,
        2: 20,
        3: 10,
        4: 3
    };
    
    const allowedHours = allowedMissing[tier] || 0;
    
    // Billable missing hours (only full hours count, after allowance)
    let billableMissingHours = Math.floor(missingHoursTotal - allowedHours);
    if (billableMissingHours < 0) billableMissingHours = 0;
    
    // Deduction rate per hour
    const deductionRatePerHour = Math.floor(basePay / 185);
    
    // Salary deduction
    const salaryDeduction = billableMissingHours * deductionRatePerHour;
    
    // Net pay
    const netPay = basePay - salaryDeduction;
    
    return Math.max(0, netPay);
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
