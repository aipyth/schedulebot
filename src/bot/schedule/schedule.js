const tz = require('date-fns-tz')
const { doc } = require('./doc');
const { getWeekNumber, getTimingsDate } = require('./timings');

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
  * @returns {{ name: string, type: string, elective: boolean, time: Date }[]}
  */
function getDateEvents(time, group) {
  const localizedTime = tz.utcToZonedTime(time, doc['timezone'])
  const weekOrder = getWeekNumber(localizedTime); 
  const docgroup = doc[group]
  if (!docgroup) { throw new Error(group + "group does not exists") }
  const weekSchedule = docgroup['week' + weekOrder];
  const day = WEEKDAYS_ORDER[localizedTime.getDay().toString()];
  if (!weekSchedule[day]) return []
  if (!Array.isArray(weekSchedule[day])) return []
  const timings = getTimingsDate()
  const events = weekSchedule[day].map((item) => {
    if (typeof item !== 'object') return {
      name: item, elective: false, type: '',
    }
    const name = Object.keys(item)[0]
    return {
      name: name,
      elective: item[name]['elective'] || false,
      type: item[name]['type'] || '',
    }
  }).map((item, i) => {
    return { ...item, time: timings[i] }
  })
  return events;
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
    *   name: string,
    *   type: string,
    *   elective: boolean,
    * }[]}
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
        if (typeof item !== 'object') continue
        const eventName = Object.keys(item)[0]
        if (item[eventName]['elective']) {
          electives[eventName] = {
            name: eventName,
            type: item[eventName],
            elective: true,
          }
        }
      }
    }
  }
  return electives;
}

/** Returns the list of events for user taking in consideration
  * its electives
  * @param {{ group: string, electives: string[], date: Date }}
  */
function getEventsFor({ group, electives, date }) {
  const events = getDateEvents(date, group)
  return events.map((item) => {
    if (item.elective === false || electives.includes(item.name)) {
      return item
    }
    return { name: '', type: '', elective: true, time: item.time }
  })
}

module.exports = {
  weekdaysint: WEEKDAYS_ORDER,
  getDateEvents,
  getGroups,
  getElectives,
  getEventsFor,
}
