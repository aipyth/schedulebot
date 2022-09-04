const { readFileSync } = require("fs");
const { load } = require('js-yaml')
const tz = require('date-fns-tz')

const scheduleFilePath = process.env['SCHEDULE_FILE_PATH']
if (!scheduleFilePath) { throw new Error('no SCHEDULE_FILE_PATH specified') }

const doc = load(readFileSync(scheduleFilePath, 'utf8'));

const weekdaysint = {
  '0': "sunday",
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

function getDateEvents(time, group) {
  const localized = tz.utcToZonedTime(time, doc['timezone'])
  const weekNum = getWeekNumber(localized); 
  const docgroup = doc[group]
  if (!docgroup) { throw new Error(group + "group does not exists") }
  const weekdays = docgroup['week' + weekNum];
  const day = weekdaysint[localized.getDay().toString()];
  return weekdays[day];
}

function getGroups() {
  return doc['groups'];
}

function getElectives(group) {
  const wn = doc['weekn'];
  let electives = {};
  for (let n = 1; n <= wn; n++) {
    const currWeek = doc[group]['week' + n];
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

function getTimings() {
  return doc['timings'];
}

function getTimingsDate() {
  let tmgs = [];
  for (t of doc['timings']) {
    const ts = t.split(':');
    let now = new Date();
    now.setHours(ts[0], ts[1], 0);
    now = tz.zonedTimeToUtc(now, doc['timezone'])
    tmgs.push(now);
  }
  return tmgs;
}

function nearestTimeIdx(toDate, byMinutes) {
  const times = getTimingsDate();
  const minutes = (msec) => msec > 0 ? msec / 60000 : Infinity;
  const index = times.findIndex(time => {
    console.log(`[nearestTime] ${time} - ${toDate}`);
    return minutes(time - toDate) <= byMinutes
  });
  return index;
}

module.exports = {
  weekdaysint,
  weeksBetween,
  getWeekNumber,
  getDateEvents,
  getGroups,
  getElectives,
  getTimings,
  getTimingsDate,
  nearestTimeIdx,
}
