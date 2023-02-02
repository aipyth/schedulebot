const TelegramBot = require('node-telegram-bot-api')
const events = require('./events')
const commands = require('./commands')

module.exports = {
  start: async () => {
    const token = process.env.BOT_TOKEN
    if (token === undefined) { throw new Error('Invalid environment variable BOT_TOKEN') }

    const bot = new TelegramBot(token, { polling: true })
    bot.getMe().then((b) => console.log(b))

    bot.on('polling_error', console.log)

    commands.addCommands(bot)
    events.runEvents(bot)

    process.once('SIGINT', () => bot.stopPolling())
    process.once('SIGTERM', () => bot.stopPolling())
  }
}
