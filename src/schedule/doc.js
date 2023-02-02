const { readFileSync } = require('fs')
const { load } = require('js-yaml')

const scheduleFilePath = process.env.SCHEDULE_FILE_PATH
if (!scheduleFilePath) { throw new Error('no SCHEDULE_FILE_PATH specified') }

const doc = load(readFileSync(scheduleFilePath, 'utf8'))

const configsFolder = scheduleFilePath.split('/').slice(0, scheduleFilePath.split('/').length - 1).join('/') + '/'

/** This function reads the groups from the groups.yml file and returns them as a dictionary. */
function readGroups () {
  const groupNames = doc.groups
  const groups = {}
  for (const groupName of groupNames) {
    groups[groupName] = load(readFileSync(configsFolder + groupName + '.yml', 'utf8'))
  }
  return groups
}

/** Load links for all groups
  * @returns {Record<string, Record<string, string>>} JSON object containing links for all groups
  **/
function readLinks () {
  const groupNames = doc.groups
  const links = {}
  for (const groupName of groupNames) {
    links[groupName] = load(readFileSync(
      configsFolder + groupName + '.links.yml',
      'utf8'
    ))
  }
  console.log(JSON.stringify(links, null, 2))
  return links
}

module.exports = {
  doc: {
    ...doc,
    ...readGroups(),
    links: readLinks()
  }
}
