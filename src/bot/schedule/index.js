const timings = require('./timings')
const schedule = require('./schedule')
const event = require('./event')
const wrap = require('./wrap')
const links = require('./links')
const { doc } = require('./doc')

module.exports = {
  doc,
  ...timings,
  ...schedule,
  ...links,
}
