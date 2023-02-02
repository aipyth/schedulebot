const { doc } = require('./doc')
const tz = require('date-fns-tz')

/** Number of weeks between two dates
  * @param {Date} d1
  * @param {Date} d2
  */
function weeksBetween (d1, d2) {
  return (d2 - d1) / (7 * 24 * 60 * 60 * 1000)
}

/** Get the order of current week regarding to 'weekn' configuration setting
  * @param {Date} d
  */
function getWeekNumber (d) {
  return Math.floor(
    weeksBetween(new Date(doc['start-date']), d) % doc.weekn
  ) + 1
}

/** Return list of timings of configuration of a format \d\d:\d\d
  * @returns {string[]}
  */
function getTimings () {
  return doc.timings
}

/** Get list of timings for events
  * @returns {Date[]}
  */
function getTimingsDate () {
  const tmgs = []
  for (const t of doc.timings) {
    const ts = t.split(':')
    let now = new Date()
    const [nday, nmonth, nyear] = [now.getDate(), now.getMonth(), now.getFullYear()]
    now = tz.zonedTimeToUtc(now, doc.timezone)
    now.setHours(ts[0], ts[1], 0)

    now.setDate(nday)
    now.setMonth(nmonth)
    now.setFullYear(nyear)
    tmgs.push(now)
  }
  return tmgs
}

/** Get the index of nearest upcoming timing
  * @param {Date} toDate
  * @param {number} threshold for which the timing should be considered as upcoming
  * @returns {number} index of the upcoming timing in timings table
  */
function nearestTimeIdx (toDate, byMinutes) {
  const times = getTimingsDate()
  const minutes = (msec) => msec > 0 ? msec / 60000 : Infinity
  const index = times.findIndex(time => {
    // console.log(`[nearestTime] ${time} - ${toDate}`);
    return minutes(time - toDate) <= byMinutes
  })
  return index
}

module.exports = {
  weeksBetween,
  getWeekNumber,
  getTimings,
  getTimingsDate,
  nearestTimeIdx
}
