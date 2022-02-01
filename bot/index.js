const TelegramBot = require('node-telegram-bot-api');
const redis = require('redis');

const schedule = require('./schedule');
const utils = require('./utils');

const electiveButtonRegexp = /elective:(.+)/;
const electiveButtonMockup = 'elective:';
const electedEventsKey = 'elected:';

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

const start = async () => {
    if (!rds.isOpen) { await rds.connect() }

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
        // console.log(callbackQuery)

        const elected = electiveButtonRegexp.exec(callbackQuery.data)[1]
        const key = electedEventsKey + callbackQuery.from.id;
        const alreadyElected = await rds.sMembers(key);
        if (alreadyElected.includes(elected)) {
            await rds.sRem(key, elected);
        } else {
            await rds.sAdd(key, elected);
        }
        bot.editMessageReplyMarkup({
            inline_keyboard: buildElectivesKeyboard(await rds.sMembers(key))
        }, {
            chat_id: callbackQuery.from.id,
            message_id: callbackQuery.message.message_id
        })
    })

    bot.onText(/\/today/, async (msg) => {
        const events = schedule.getDateEvents(new Date());
        if (events == undefined) {
            bot.sendMessage(msg.chat.id, `No events for today`);
            return;
        }
        const tmgs = schedule.getTimings();
        let text = '';
        for (let i = 0; i < events.length; i++) {
            let eventName;
            console.log('considering', i, events[i]);
            if (typeof(events[i]) == 'string') {
                eventName = '';
            } else {
                const name = Object.keys(events[i])[0];
                const key = electedEventsKey + msg.from.id;
                const choose = await rds.sIsMember(key, name);
                console.log(name, "is elected", choose);
                eventName = choose || !(events[i][name]['elective']) ? name : "";
            } 
            text += `${tmgs[i]} ${eventName} \n`;
        }
        bot.sendMessage(msg.chat.id, text);
    })

    process.once('SIGINT', () => bot.stopPolling());
    process.once('SIGTERM', () => bot.stopPolling());

    utils.repeatWhile(1000)
        .if(true)
        .then(() => {
            console.log("rechecking time");
            const now = new Date();
            const times = schedule.getTimings();
            const diffs = times.map((t) => (t - now) / 60 * 1000)
        })
}
start();

