const TelegramBot = require('node-telegram-bot-api');
const redis = require('redis');

const schedule = require('./schedule');
const utils = require('./utils');

const electiveButtonRegexp = /elective:(.+)/;
const electiveButtonMockup = 'elective:';
const electedEventsKey = 'elected:';
const usersKey = 'users';

const devContactTag = '@aipyth';

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
        rds.sAdd(usersKey, chatId).catch((reason) => {
            console.log(reason);
            bot.sendMessage(chatId, `Could not add you to database. Contact ${devContactTag}`);
        })
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
            if (typeof(events[i]) == 'string') {
                eventName = '';
            } else {
                const name = Object.keys(events[i])[0];
                const key = electedEventsKey + msg.from.id;
                try {
                    const choose = await rds.sIsMember(key, name);
                    eventName = choose || !(events[i][name]['elective']) ? name : "";
                } catch (e) {
                    console.log(e);
                    bot.sendMessage(msg.chat.id, `Error gettings your electives. Contact ${devContactTag}`);
                }
            } 
            text += `${tmgs[i]} ${eventName} \n`;
        }
        bot.sendMessage(msg.chat.id, text);
    })

    process.once('SIGINT', () => bot.stopPolling());
    process.once('SIGTERM', () => bot.stopPolling());

    utils.repeatWhile(2 * 60 * 1000)
        .if(() => {
            const idx = schedule.nearestTimeIdx(new Date(), 1);
            return idx < 0 ? undefined : idx;
        }).then(async (res) => {
            console.log('Event in one minute');
            rds.sMembers(usersKey).catch((reason) => {
                console.log(reason);
            }).then((value) => {
                const eventNumber = res;
                console.log(res);
                const event = schedule.getDateEvents(new Date())[eventNumber];
                console.log(schedule.getDateEvents(new Date()));
                if (typeof(event) == 'string') {

                } else {
                    const name = Object.keys(event)[0];
                    for (chatId of value) {
                        const key = electedEventsKey + chatId;
                        rds.sIsMember(key, name).catch((reason) => {
                            console.log(reason);
                            bot.sendMessage(chatId, `Error gettings your electives. Contact ${devContactTag}`);
                        }).then((value) => {
                            if (value || !(event[name]['elective'])) {
                                console.log(`Sending event ${name} to ${chatId}`);
                                bot.sendMessage(chatId, `${name}
                                ${event[name]['type']}
                                ${event[name]['link']}`);
                            }
                        })
                    }
                } 
            })
        })
}
start();

