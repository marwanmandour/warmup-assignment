# Let me create the complete solution based on the assignment requirements
# First, let me understand the data formats and implement all 10 functions

solution_code = '''const fs = require("fs");

// ============================================================
// Helper Functions
// ============================================================

// Convert time string (h:mm:ss or hh:mm:ss) to total seconds
function timeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    return hours * 3600 + minutes * 60 + seconds;
}

// Convert total seconds to time string (h:mm:ss)
function secondsToTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Convert 12-hour format to 24-hour format and get total seconds from midnight
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
    
    // Handle overnight shifts (if end time is earlier than start time, assume next day)
    if (diff < 0) {
        diff += 24 * 3600;
    }
    
    return secondsToTime(diff);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// Idle time is time before 8 AM (8:00:00) and after 10 PM (22:00:00)
// ============================================================
function getIdleTime(startTime, endTime) {
    const startSeconds = parseTimeToSeconds(startTime);
    const endSeconds = parseTimeToSeconds(endTime);
    
    // Handle overnight shifts
    let actualEndSeconds = endSeconds;
    if (endSeconds < startSeconds) {
        actualEndSeconds += 24 * 3600;
    }
    
    const EIGHT_AM = 8 * 3600;      // 8:00:00
    const TEN_PM = 22 * 3600;       // 22:00:00
    const MIDNIGHT = 24 * 3600;     // 24:00:00
    
    let idleSeconds = 0;
    
    // Calculate idle time for each hour in the shift
    let current = startSeconds;
    let end = actualEndSeconds;
    
    while (current < end) {
        const hourOfDay = current % (24 * 3600);
        
        // Check if current time is outside delivery hours (before 8 AM or after 10 PM)
        if (hourOfDay < EIGHT_AM || hourOfDay >= TEN_PM) {
            idleSeconds++;
        }
        current++;
    }
    
    return secondsToTime(idleSeconds);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const durationSeconds = timeToSeconds(shiftDuration);
    const idleSeconds = timeToSeconds(idleTime);
    const activeSeconds = durationSeconds - idleSeconds;
    return secondsToTime(activeSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// Normal days: 8h 24m = 8*3600 + 24*60 = 30240 seconds
// Eid period (Apr 10-30, 2025): 6h = 21600 seconds
// ============================================================
function metQuota(date, activeTime) {
    const activeSeconds = timeToSeconds(activeTime);
    
    // Parse date
    const [year, month, day] = date.split('-').map(Number);
    
    // Check if date is in Eid period (April 10-30, 2025)
    const isEidPeriod = (year === 2025 && month === 4 && day >= 10 && day <= 30);
    
    // Quota thresholds in seconds
    const NORMAL_QUOTA = 8 * 3600 + 24 * 60;  // 8h 24m = 30240 seconds
    const EID_QUOTA = 6 * 3600;  // 6h = 21600 seconds
    
    const quota = isEidPeriod ? EID_QUOTA : NORMAL_QUOTA;
    
    return activeSeconds >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// shiftObj: { driverID, driverName, date, startTime, endTime }
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // Validate required fields
    if (!shiftObj.driverID || !shiftObj.driverName || !shiftObj.date || 
        !shiftObj.startTime || !shiftObj.endTime) {
        return {};
    }
    
    // Read existing records
    let content;
    try {
        content = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return {};
    }
    
    const lines = content.trim().split('\\n');
    const headers = lines[0];
    const records = lines.slice(1).filter(line => line.trim() !== '');
    
    // Check for duplicate (same driverID and date)
    for (const record of records) {
        const fields = record.split(',');
        if (fields[0] === shiftObj.driverID && fields[2] === shiftObj.date) {
            return {};
        }
    }
    
    // Calculate derived fields
    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const metQuotaValue = metQuota(shiftObj.date, activeTime);
    const hasBonus = false;  // Default value
    
    // Create new record
    const newRecord = [
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
    ].join(',');
    
    // Add to records and sort by date, then by driverID
    records.push(newRecord);
    records.sort((a, b) => {
        const aFields = a.split(',');
        const bFields = b.split(',');
        const dateCompare = aFields[2].localeCompare(bFields[2]);
        if (dateCompare !== 0) return dateCompare;
        return aFields[0].localeCompare(bFields[0]);
    });
    
    // Write back to file
    const newContent = headers + '\\n' + records.join('\\n') + '\\n';
    fs.writeFileSync(textFile, newContent);
    
    // Return the shift object with all fields
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
    
    const lines = content.trim().split('\\n');
    const headers = lines[0];
    const records = lines.slice(1);
    
    // Find and update the record
    const updatedRecords = records.map(record => {
        const fields = record.split(',');
        if (fields[0] === driverID && fields[2] === date) {
            fields[9] = newValue.toString();
            return fields.join(',');
        }
        return record;
    });
    
    // Write back to file
    const newContent = headers + '\\n' + updatedRecords.join('\\n') + '\\n';
    fs.writeFileSync(textFile, newContent);
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// month: string formatted as mm or m
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let content;
    try {
        content = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return -1;
    }
    
    const lines = content.trim().split('\\n');
    const records = lines.slice(1);
    
    let driverExists = false;
    let bonusCount = 0;
    
    // Normalize month to 2 digits
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
// month: number
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let content;
    try {
        content = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return "000:00:00";
    }
    
    const lines = content.trim().split('\\n');
    const records = lines.slice(1);
    
    let totalSeconds = 0;
    const targetMonth = month.toString().padStart(2, '0');
    
    for (const record of records) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            const recordMonth = fields[2].split('-')[1];
            if (recordMonth === targetMonth) {
                totalSeconds += timeToSeconds(fields[7]);  // ActiveTime is at index 7
            }
        }
    }
    
    // Format as hhh:mm:ss (3-digit hours)
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(3, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // Read driver rates
    let rateContent;
    try {
        rateContent = fs.readFileSync(rateFile, 'utf8');
    } catch (err) {
        return "000:00:00";
    }
    
    const rateLines = rateContent.trim().split('\\n');
    const rateRecords = rateLines.slice(1);
    
    // Find driver's day off
    let dayOff = null;
    for (const record of rateRecords) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            dayOff = fields[2].toLowerCase();  // Day off is at index 2
            break;
        }
    }
    
    if (!dayOff) {
        return "000:00:00";
    }
    
    // Read shifts to find working days
    let shiftContent;
    try {
        shiftContent = fs.readFileSync(textFile, 'utf8');
    } catch (err) {
        return "000:00:00";
    }
    
    const shiftLines = shiftContent.trim().split('\\n');
    const shiftRecords = shiftLines.slice(1);
    
    const targetMonth = month.toString().padStart(2, '0');
    let workingDays = 0;
    
    // Day name mapping
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (const record of shiftRecords) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            const dateParts = fields[2].split('-');
            const recordMonth = dateParts[1];
            if (recordMonth === targetMonth) {
                const date = new Date(fields[2]);
                const dayName = dayNames[date.getDay()];
                if (dayName !== dayOff) {
                    workingDays++;
                }
            }
        }
    }
    
    // Calculate required hours
    // Normal quota: 8h 24m per day, Eid quota: 6h per day
    // April 2025: days 1-9 normal, days 10-30 Eid
    let totalRequiredSeconds = 0;
    
    for (let day = 1; day <= 31; day++) {
        const dateStr = `2025-${targetMonth}-${day.toString().padStart(2, '0')}`;
        const date = new Date(dateStr);
        
        // Check if valid date
        if (date.getMonth() + 1 !== parseInt(month)) continue;
        
        const dayName = dayNames[date.getDay()];
        
        // Skip day off
        if (dayName === dayOff) continue;
        
        // Check if in Eid period (April 10-30, 2025)
        const isEidPeriod = (month === 4 && day >= 10 && day <= 30);
        
        if (isEidPeriod) {
            totalRequiredSeconds += 6 * 3600;  // 6 hours
        } else {
            totalRequiredSeconds += 8 * 3600 + 24 * 60;  // 8h 24m
        }
    }
    
    // Subtract bonus hours (4 hours per bonus)
    totalRequiredSeconds -= bonusCount * 4 * 3600;
    
    if (totalRequiredSeconds < 0) totalRequiredSeconds = 0;
    
    // Format as hhh:mm:ss
    const hours = Math.floor(totalRequiredSeconds / 3600);
    const minutes = Math.floor((totalRequiredSeconds % 3600) / 60);
    const seconds = totalRequiredSeconds % 60;
    return `${hours.toString().padStart(3, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    
    const rateLines = rateContent.trim().split('\\n');
    const rateRecords = rateLines.slice(1);
    
    let baseSalary = 0;
    let tier = '';
    
    for (const record of rateRecords) {
        const fields = record.split(',');
        if (fields[0] === driverID) {
            tier = fields[1];  // Tier is at index 1
            baseSalary = parseInt(fields[3], 10);  // Monthly base salary at index 3
            break;
        }
    }
    
    if (baseSalary === 0) return 0;
    
    // Parse hours
    const actualSeconds = timeToSeconds(actualHours);
    const requiredSeconds = timeToSeconds(requiredHours);
    
    // Calculate hourly rate based on required hours
    // Assuming 4 weeks per month, required hours per week = requiredSeconds / 4
    // But we need to calculate based on the tier
    
    // Tier allowances
    const tierAllowances = {
        'A': 500,
        'B': 300,
        'C': 100
    };
    
    const allowance = tierAllowances[tier] || 0;
    
    // Calculate deduction for missing hours
    let deduction = 0;
    if (actualSeconds < requiredSeconds) {
        const missingSeconds = requiredSeconds - actualSeconds;
        const missingHours = missingSeconds / 3600;
        // Hourly rate = baseSalary / (requiredSeconds / 3600)
        const hourlyRate = baseSalary / (requiredSeconds / 3600);
        deduction = missingHours * hourlyRate;
    }
    
    const netPay = Math.round(baseSalary + allowance - deduction);
    return netPay > 0 ? netPay : 0;
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
'''

print(solution_code)
