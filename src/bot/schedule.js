const yaml = require('js-yaml');
const fs = require('fs');

const scheduleFilePath = process.env['SCHEDULE_FILE_PATH']
if (!scheduleFilePath) { throw new Error('no SCHEDULE_FILE_PATH specified') }

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

function getDateEvents(time, group) {
  const localized = new Date(time.getTime() + doc['timezone-delta'] * 60 * 60000);
  const weekNum = getWeekNumber(localized); 
  const weekdays = doc[group]['week' + weekNum];
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
    now = new Date(now.getTime() - doc['timezone-delta'] * 60 * 60000);
    tmgs.push(now);
  }
  return tmgs;
}

function nearestTimeIdx(toDate, byMinutes) {
  const times = getTimingsDate();
  const minutes = (msec) => msec > 0 ? msec / 60000 : Infinity;
  const index = times.findIndex(time => {
    // console.log(`[nearestTime] ${time} - ${toDate}`);
    return minutes(time - toDate) <= byMinutes
  });
  return index;
}

module.exports = {
  weekdaysint,
  getWeekNumber,
  getDateEvents,
  getGroups,
  getElectives,
  getTimings,
  getTimingsDate,
  nearestTimeIdx,
}
