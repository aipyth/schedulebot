const bot = require('./bot')
const storage = require('./storage')

async function main () {
  await storage.connect()
  bot.start()
}

main()
