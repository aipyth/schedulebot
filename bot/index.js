const TelegramBot = require('node-telegram-bot-api');
const redis = require('redis');

const schedule = require('./schedule');
const utils = require('./utils');

// Inline keyboard buttons data
const electiveButtonRegexp = 'elective:(.+)';
const electiveButtonMockup = 'elective:';
const groupsButtonRegexp = 'groups:(.+)';
const groupsButtonMockup = 'groups:';

// Redis keys
const electedEventsKey = 'elected:';
const usersKey = 'users';
const userGroupKey = 'usergroup:';

const devContactTag = '@aipyth';
const repoLink = 'https://github.com/aipyth/schedulebot';

const sendLinkBeforeMinutes = 1;


/* THIS PROJECT CONTAINS A LOT OF CODE WRITTEN IN A HASTE
 * DO NOT HESITATE TO REVIEW AND REFACTOR IT
 */


const buildElectivesKeyboard = (group, elected=[]) => {
    const electives = schedule.getElectives(group);
    let kb = [];
    for (const elect of Object.keys(electives)) {
        if (elected.includes(elect)) {
            kb.push([{
                text: '✅ ' + elect,
                callback_data: electiveButtonMockup + elect
            }]);
        } else {
            kb.push([{
                text: elect,
                callback_data: electiveButtonMockup + elect
            }]);
        }
    }
    return kb;
}

const buildGroupsKeyboard = (chosen=[]) => {
    const groups = schedule.getGroups();
    let kb = [];
    for (const group of groups) {
        if (chosen.includes(group)) {
            kb.push([{
                text: '✅ ' + group,
                callback_data: groupsButtonMockup + group,
            }]);
        } else {
            kb.push([{
                text: group,
                callback_data: groupsButtonMockup + group,
            }]);
        }
    }
    return kb;
}

const rds = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
});
rds.on('error', (err) => console.error('Redis Client Error', err));

const start = async () => {
    if (!rds.isOpen) { await rds.connect() }

    const token = process.env.BOT_TOKEN;
    if (token == undefined) { throw "Invalid environment variable BOT_TOKEN"; }

    const bot = new TelegramBot(token, { polling: true });

    bot.on("polling_error", console.log);

    const askGroup = async (chatId) => {
        const group = await rds.get(userGroupKey + chatId);
        bot.sendMessage(chatId, `Lets choose your group:`, {
            reply_markup: {
                inline_keyboard: group ? buildGroupsKeyboard([group]) : buildGroupsKeyboard(),
            }
        });
    }

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        rds.sAdd(usersKey, chatId).catch((reason) => {
            console.error(reason);
            bot.sendMessage(chatId, `Could not add you to database. Contact ${devContactTag}`);
        })
        bot.sendMessage(chatId, `Hi! Here you can get your schedule and get link one minute before the lesson.

This bot is opensource and you can view it here ${repoLink} as well as add your group schedule by creating pull-request.`);
        await askGroup(chatId);
    });


    const callback_processers = {
        [electiveButtonRegexp]: async (callbackQuery) => {
            const elected = RegExp(electiveButtonRegexp).exec(callbackQuery.data)[1]
            const key = electedEventsKey + callbackQuery.from.id;
            const alreadyElected = await rds.sMembers(key);
            if (alreadyElected.includes(elected)) {
                await rds.sRem(key, elected);
            } else {
                await rds.sAdd(key, elected);
            }
            const group = await rds.get(userGroupKey + callbackQuery.from.id);
            bot.answerCallbackQuery(callbackQuery.id);
            bot.editMessageReplyMarkup({
                inline_keyboard: buildElectivesKeyboard(group, await rds.sMembers(key))
            }, {
                chat_id: callbackQuery.from.id,
                message_id: callbackQuery.message.message_id
            })
        },

        [groupsButtonRegexp]: async (callbackQuery) => {
            const chosen = RegExp(groupsButtonRegexp).exec(callbackQuery.data)[1];
            const key = userGroupKey + callbackQuery.from.id;
            const chosenGroup = await rds.get(userGroupKey + callbackQuery.from.id);
            if (chosenGroup == chosen) {
                await rds.del(key);
            } else {
                await rds.set(key, chosen); 

                bot.sendMessage(callbackQuery.from.id, `Choose your electives now:`, {
                    reply_markup: {
                        inline_keyboard: buildElectivesKeyboard(chosen),
                    }
                });
            }

            const allElectives = await rds.sMembers(electedEventsKey + callbackQuery.from.id);
            for (const elective of allElectives) {
                await rds.sRem(electedEventsKey + callbackQuery.from.id, elective);
            }

            bot.answerCallbackQuery(callbackQuery.id);
            bot.editMessageReplyMarkup({
                inline_keyboard: buildGroupsKeyboard([chosen])
            }, {
                chat_id: callbackQuery.from.id,
                message_id: callbackQuery.message.message_id
            })
        },
    }

    bot.on('callback_query', async (callbackQuery) => {
        for (const r of Object.keys(callback_processers)) {
            if (RegExp(r).test(callbackQuery.data)) {
                callback_processers[r](callbackQuery);
            }
        }
    })

    bot.onText(/\/today/, async (msg) => {
        const group = await rds.get(userGroupKey + msg.chat.id);
        if (!group) {
            bot.sendMessage(msg.chat.id, `You haven't set your group`);
            await askGroup(msg.chat.id);
            return;
        }

        const events = schedule.getDateEvents(new Date(), group);
        if (events == undefined) {
            bot.sendMessage(msg.chat.id, `No events for today`);
            return;
        }
        const tmgs = schedule.getTimings();
        let text = '';
        for (let i = 0; i < events.length; i++) {
            let eventName;
            if (typeof(events[i]) == 'string' && events[i] == 'Opening') {
                eventName = '';
            } else if (typeof(events[i]) == 'string') {
                eventName = events[i];
            } else {
                const name = Object.keys(events[i])[0];
                const key = electedEventsKey + msg.from.id;
                try {
                    const choose = await rds.sIsMember(key, name);
                    eventName = choose || !(events[i][name]['elective']) ? 
                        `${name} - ${events[i][name]['type']}`
                        : "";
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

    // Is used to send all information to specified users (id's) about event
    const sendUsersUpcomingEvent = async (users, eventNumber) => {
        for (const chatId of users) {
            const group = await rds.get(userGroupKey + chatId);
            if (!group) { continue }
            const event = schedule.getDateEvents(new Date(), group)[eventNumber];
            if (typeof(event) == 'string' && event != 'Opening') {
                bot.sendMessage(chatId, event);
            } else {
                const name = Object.keys(event)[0];
                const key = electedEventsKey + chatId;
                rds.sIsMember(key, name).catch((reason) => {
                    console.error(reason);
                    bot.sendMessage(chatId, `Error gettings your electives. Contact ${devContactTag}`);
                }).then((value) => {
                    if (value || !(event[name]['elective'])) {
                        bot.sendMessage(chatId, `${name} \n ${event[name]['type']} \n ${event[name]['link']}`);
                    }
                })
            } 
        }
        
    }

    utils.repeatWhile(60000 * sendLinkBeforeMinutes)
        .atSeconds(1)
        .if(() => {
            const idx = schedule.nearestTimeIdx(new Date(), sendLinkBeforeMinutes);
            return idx < 0 ? undefined : idx;
        }).then(async (res) => {
            rds.sMembers(usersKey).catch((reason) => {
                console.log(reason);
            }).then((value) => sendUsersUpcomingEvent(value, res))
        }).run()
}

start();
