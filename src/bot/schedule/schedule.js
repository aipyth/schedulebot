const tz = require('date-fns-tz')
const { doc } = require('./doc')
const timings =  require('./timings')

const WEEKDAYS_ORDER = {
  '0': "sunday",
  '1': "monday",
  '2': "tuesday",
  '3': "wednesday",
  '4': "thursday",
  '5': "friday",
  '6': "saturday",
}


/** Get all event for time (date) of group
  * @param {Date} time
  * @param {string} group
  * @throws {Error} If the group does not exist in configuration
  * @returns {ScheduleEvent}
  */
function getDateEvents(time, group) {
  const localizedTime = tz.utcToZonedTime(time, doc['timezone'])
  const weekOrder = timings.getWeekNumber(localizedTime); 
  const docgroup = doc[group]
  if (!docgroup) { throw new Error(group + "group does not exists") }
  const weekSchedule = docgroup['week' + weekOrder];
  const day = WEEKDAYS_ORDER[localizedTime.getDay().toString()];
  if (!weekSchedule[day]) return []
  if (!Array.isArray(weekSchedule[day])) return []
  return weekSchedule[day];
}

/** Get listed groups
  * @returns {string[]}
  */
function getGroups() {
  return doc['groups'];
}

/** Get object of all electives for given group
  * @param {string} group
  * @returns {{
    * [string]: any
    * }}
  */
function getElectives(group) {
  const wn = doc['weekn'];
  let electives = {};
  for (let n = 1; n <= wn; n++) {
    const currWeek = doc[group]['week' + n];
    for (let i = 0; i <= 6; i++) {
      const dayEvents = currWeek[WEEKDAYS_ORDER[i.toString()]]
      if (!dayEvents) continue
      for (item of dayEvents) {
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
  weekdaysint: WEEKDAYS_ORDER,
  getDateEvents,
  getGroups,
  getElectives,
}
