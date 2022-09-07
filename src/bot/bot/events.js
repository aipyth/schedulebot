const TelegramBot = require("node-telegram-bot-api");

const utils = require('../utils')
const schedule = require('../schedule')
const storage = require('../storage');
const { getLink } = require("../schedule");

const sendLinkBeforeMinutes = 1;

const gapConfigName = 'Window'

/** Is used to send all information to specified users (id's) about event
  * @param {TelegramBot} bot
  * @param {string[]} users
  * @param {number} eventNumber
  */
const sendUsersUpcomingEvent = async (bot, users, eventNumber) => {
  console.dir({
    bot, users, eventNumber,
  })
  for (const chatId of users) {
    const group = await storage.getUserGroup(chatId)
    if (!group) { continue }
    const event = schedule.getDateEvents(new Date(), group)[eventNumber];
    if (event.name == gapConfigName) {
      continue
      // bot.sendMessage(chatId, event.name);
    } else {
      try {
        const hasUserElected = await storage.hasUserElected(chatId, event.name)

        if (hasUserElected || !event.elective) {
          const link = getLink(group, event.name, event.type)
          bot.sendMessage(chatId,
            `**${event.name}** \n*${event.type}* \n\n${link}`,
            { parse_mode: 'Markdown' },
          );
        }
      } catch (e) {
        console.error(e)
      }
    } 
  }
  
}

module.exports = {
  /**
  * @param {TelegramBot} bot
  */
  runEvents(bot) {
    utils.repeatWhile(60000 * sendLinkBeforeMinutes)
      .atSeconds(1)
      .if(() => {
        const idx = schedule.nearestTimeIdx(new Date(), sendLinkBeforeMinutes);
        console.log(`[eventCheck] idx = ${idx}`);
        return idx < 0 ? undefined : idx;
      }).then(async (res) => {
        console.log(`triggered on #${res} event`)
        storage.getAllUsers()
          .catch((reason) => {
            console.log(reason);
          })
          .then((users) => sendUsersUpcomingEvent(bot, users, res))
      }).run()
  }
}