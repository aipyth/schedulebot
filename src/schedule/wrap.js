const wrapEventDetailed = ({ name, type, link }) => {
  return `**${name}** \n${type} \n${link}`
}

const wrapEventSimple = ({ time, name, type, link }) => {
  const t = time?.toLocaleTimeString('uk', { hour12: false, hour: '2-digit', minute: '2-digit' })
  return `${t}  ${name}   ${type}`
}

/** @param {{ name: string, type: string }[]} events
  * @param {Date} date
  */
const wrapEventsFor = (events, date) => {
  let wrappedEvents = ''
  for (const event of events) {
    if (!event) continue
    wrappedEvents += wrapEventSimple(event) + '\n'
  }
  const todayDate = date.toLocaleDateString('en', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  return `***${todayDate}***\n${wrappedEvents}`
}

/** Wraps all links records into a human readable string.
  * @params {Record<string, string>} links
  */
function wrapEventLinks (links) {
  let wrapped = ''
  for (const eventType of Object.keys(links)) {
    wrapped += `***${eventType}***\n${links[eventType]}`
    wrapped += '\n\n'
  }
  return wrapped
}

module.exports = {
  wrapEventSimple,
  wrapEventDetailed,
  wrapEventsFor,
  wrapEventLinks
}
