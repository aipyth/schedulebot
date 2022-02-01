const yaml = require('js-yaml');
const fs = require('fs');

const doc = yaml.load(fs.readFileSync('./schedule.yml', 'utf8'));

const weekdaysint = {
    '1': "monday",
    '2': "tuesday",
    '3': "wednesday",
    '4': "thursday",
    '5': "friday",
    '6': "saturday",
}

function weeksBetween(d1, d2) {
    return (d2 - d1) / (7 * 24 * 60 * 60 * 1000);
}

function getWeekNumber(d) {
    return Math.floor(weeksBetween(new Date(doc['start-date']), d) % doc['weekn']) + 1;
}

function getDateEvents(time) {
    const localized = new Date(time.getTime() + doc['timezone-delta'] * 60 * 60000);
    const weekNum = getWeekNumber(localized); 
    const weekdays = doc['week' + weekNum];
    const day = weekdaysint[localized.getDay().toString()];
    return weekdays[day];
}

// console.log("Day today: ", new Date());
// console.log("Events today: ", getDateEvents(new Date()));
// console.log("Events on next friday: " , getDateEvents(new Date("Fri Feb 11 2022")));

function getElectives() {
    const wn = doc['weekn'];
    let electives = {};
    for (let n = 1; n <= wn; n++) {
        const currWeek = doc['week' + n];
        for (let i = 1; i <= 6; i++) {
            for (item of currWeek[weekdaysint[i.toString()]]) {
                const eventName = Object.keys(item)[0]
                if (item[eventName]['elective']) {
                    electives[eventName] = item[eventName];
                }
            }
        }
    }
    return electives;
}

module.exports = {
    getWeekNumber,
    getDateEvents,
    getElectives,
}
