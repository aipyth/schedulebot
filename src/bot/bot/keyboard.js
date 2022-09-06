const schedule = require('../schedule')

const electiveButtonRegexp = 'elective:(.+)';
const electiveButtonPrefix = 'elective:';
const groupsButtonRegexp = 'groups:(.+)';
const groupsButtonPrefix = 'groups:';

/** 
  * @param {string} group
  * @param {string[]} elected list of already elected courses that
  *                   will have a `confirmed` emoji near the name
  */
const buildElectivesKeyboard = (group, elected=[]) => {
  const electives = schedule.getElectives(group);
  let kb = [];
  for (const elect of Object.keys(electives)) {
    if (elected.includes(elect)) {
      kb.push([{
        text: '✅ ' + elect,
        callback_data: electiveButtonPrefix + elect
      }]);
    } else {
      kb.push([{
        text: elect,
        callback_data: electiveButtonPrefix + elect
      }]);
    }
  }
  return kb;
}

/** 
  * @param {string[]} chosen
  */
const buildGroupsKeyboard = (chosen=[]) => {
  const groups = schedule.getGroups();
  let kb = [];
  for (const group of groups) {
    if (chosen.includes(group)) {
      kb.push([{
        text: '✅ ' + group,
        callback_data: groupsButtonPrefix + group,
      }]);
    } else {
      kb.push([{
        text: group,
        callback_data: groupsButtonPrefix + group,
      }]);
    }
  }
  return kb;
}

module.exports = {
  electiveButtonRegexp,
  electiveButtonPrefix,
  groupsButtonRegexp,
  groupsButtonPrefix,
  buildElectivesKeyboard,
  buildGroupsKeyboard,
}
