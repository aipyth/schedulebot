const { doc } = require('./doc')

/** Returns a link to event course type
  * @param {string} group
  * @param {string} course
  * @param {type} string
  * @returns {string}
  */
function getLink(group, course, type) {
  const grouplinks = doc.links[group]
  if (grouplinks == undefined) return ''
  if (grouplinks[course] == undefined) return ''
  return grouplinks[course][type] || ''
}

module.exports = {
  getLink,
}
