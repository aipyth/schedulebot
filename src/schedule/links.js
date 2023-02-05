const { doc } = require('./doc')

/** Returns a link to event course type
  * @param {string} group
  * @param {string} course
  * @param {string} type
  * @returns {string}
  */
function getLink (group, course, type) {
  const grouplinks = doc.links[group]
  if (grouplinks === undefined) return ''
  if (grouplinks[course] === undefined) return ''
  return grouplinks[course][type] || ''
}

/** Returns all links to event course
  * @param {string} group
  * @param {string} course
  * @returns {Record<string, string>}
  */
function getAllLinks (group, course) {
  const grouplinks = doc.links[group]
  if (grouplinks === undefined) return {}
  if (grouplinks[course] === undefined) return {}
  return grouplinks[course] ?? {}
}

module.exports = {
  getLink, getAllLinks
}
