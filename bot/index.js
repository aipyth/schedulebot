const TelegramBot = require('node-telegram-bot-api');
const redis = require('redis');

const schedule = require('./schedule.js');

const electiveButtonRegexp = /elective:(.+)/;
const electiveButtonMockup = 'elective:';
function buildElectivesKeyboard(elected=[]) {
    const electives = schedule.getElectives();
    let kb = [];
    for (elect of Object.keys(electives)) {
        if (elected.includes(elect)) {
            kb.push([{text: '✅ ' + elect, callback_data: electiveButtonMockup + elect}]);
        } else {
            kb.push([{text: elect, callback_data: electiveButtonMockup + elect}]);
        }
    }
    return kb;
}


const rds = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
});
rds.on('error', (err) => console.log('Redis Client Error', err));
console.log(`redis connects to redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`);

const token = process.env.BOT_TOKEN;
if (token == undefined) { throw "Invalid environment variable BOT_TOKEN"; }

const bot = new TelegramBot(token, { polling: true });

bot.on("polling_error", console.log);

bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Hi. Lets choose your electives firstly:`, {
        reply_markup: {
            inline_keyboard: buildElectivesKeyboard(),
        }
    });
});

bot.on('callback_query', async (callbackQuery) => {
    if (!rds.isOpen) { await rds.connect() }
    console.log(callbackQuery)

    const elected = electiveButtonRegexp.exec(callbackQuery.data)[1]
    const rdsKey = `elective:${callbackQuery.from.id}`
    const alreadyElected = await rds.sMembers(rdsKey);
    if (alreadyElected.includes(elected)) {
        await rds.sRem(rdsKey, elected);
    } else {
        await rds.sAdd(rdsKey, elected);
    }
    bot.editMessageReplyMarkup({
        inline_keyboard: buildElectivesKeyboard(await rds.sMembers(rdsKey))
    }, {
        chat_id: callbackQuery.from.id,
        message_id: callbackQuery.message.message_id
    })
})

process.once('SIGINT', () => bot.stopPolling());
process.once('SIGTERM', () => bot.stopPolling());
