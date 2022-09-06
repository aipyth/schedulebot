const { readFileSync } = require("fs");
const { load } = require('js-yaml')

const scheduleFilePath = process.env['SCHEDULE_FILE_PATH']
if (!scheduleFilePath) { throw new Error('no SCHEDULE_FILE_PATH specified') }

const doc = load(readFileSync(scheduleFilePath, 'utf8'));

function readGroups() {
  const groupNames = doc['groups']
  const groups = {}
  const folder = scheduleFilePath.split('/').slice(0, scheduleFilePath.split('/').length - 1).join('/') + '/'
  for (const groupName of groupNames) {
    groups[groupName] = load(readFileSync(folder + groupName + '.yml', 'utf8'))
  }
  return groups
}

module.exports = {
  doc: {
    ...doc,
    ...readGroups(),
  },
}
