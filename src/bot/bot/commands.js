const TelegramBot = require("node-telegram-bot-api");

const schedule = require('../schedule');
const keyboard = require('./keyboard');
const storage = require('../storage');
const { wrapEventsFor } = require("../schedule/wrap");
const { utcToZonedTime } = require("date-fns-tz");
const { doc } = require("../schedule");

const repoLink = 'https://github.com/aipyth/schedulebot';

/**
  * @param {TelegramBot} bot
  * @returns {(chatId:TelegramBot.ChatId) => Promise}
  */
const askGroup = (bot) => async (chatId) => {
  await storage.addUser(chatId)
  const group = await storage.getUserGroup(chatId)
  bot.sendMessage(chatId, `Lets choose your group:`, {
    reply_markup: {
      inline_keyboard: group
        ? keyboard.buildGroupsKeyboard([group])
        : keyboard.buildGroupsKeyboard(),
    }
  });
}

/**
  * @param {TelegramBot.Message} msg
  * @returns {(chatId:TelegramBot.ChatId) => Promise}
  */
const onStart = (bot) => async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Hi! Here you can get your schedule and get link one minute before the lesson.

This bot is opensource and you can view it here ${repoLink} as well as add your group schedule by creating pull-request.`);

  try {
    const result = await storage.addUser(chatId)
    // const result = await storage.getUserGroup(chatId)
    if (result == 0) {
      await askGroup(bot)(chatId);
    }
  } catch (e) {
    console.error(e);
    bot.sendMessage(chatId, `Could not add you to the database.`);
  }
}

/**
  * @param {TelegramBot.Message} msg
  * @returns {(chatId:TelegramBot.ChatId) => Promise}
  */
const group = (bot) => async (msg) => {
  const chatId = msg.chat.id
  await storage.deleteUserGroup(chatId)
  await askGroup(bot)(chatId);
}

/**
  * @param {TelegramBot} bot
  * @returns {(msg:TelegramBot.Message) => Promise}
  */
const today = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }

  const today = utcToZonedTime(new Date(), doc['timezone']);
  const events = schedule.getEventsFor({
    date: today, group,
    electives: await storage.getUserElectives(msg.chat.id),
  });
  if (events === undefined || events?.length === 0) {
    bot.sendMessage(msg.chat.id, `No events for today`);
    return;
  }
  const text = wrapEventsFor(events, today)
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

/**
  * @param {TelegramBot.Message} msg
  * @returns {(chatId:TelegramBot.ChatId) => Promise}
  */
const tomorrow = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }

  const tomorrow = utcToZonedTime(new Date(new Date().getTime() + (24 * 60 * 60 * 1000)), doc['timezone']);
  const events = schedule.getEventsFor({
    date: tomorrow, group,
    electives: await storage.getUserElectives(msg.chat.id),
  });
  if (events === undefined || events?.length === 0) {
    bot.sendMessage(msg.chat.id, `No events for today`);
    return;
  }
  const text = wrapEventsFor(events, tomorrow)
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

/**
  * @param {TelegramBot.Message} msg
  * @returns {(chatId:TelegramBot.ChatId) => Promise}
  */
const nextWeek = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }

  const today = utcToZonedTime(new Date(), doc['timezone']);
  const shift = (8 - today.getDay()) % 8;
  let text = '';
  for (let daynum = 0; daynum < 7; daynum++) {
    const day = utcToZonedTime(new Date(today.getTime() + ((shift + daynum) * 24 * 60 * 60 * 1000)), doc['timezone']);
    const events = schedule.getEventsFor({
      date: day, group,
      electives: await storage.getUserElectives(msg.chat.id),
    });
    if (events === undefined || events?.length === 0) {
      text += `${day.toDateString()} No events \n`;
    } else {
      text += `${wrapEventsFor(events, day)}\n`;
    }
  }
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

/**
  * @param {TelegramBot.Message} msg
  * @returns {(chatId:TelegramBot.ChatId) => Promise}
  */
const thisWeek = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }
  // TODO: whatatafack is going here?
  const today = utcToZonedTime(new Date(), doc['timezone']);
  const shift = (8 - today.getDay()) % 8;
  let text = '';
  for (let daynum = 0; daynum < shift; daynum++) {
    const day = utcToZonedTime(new Date(today.getTime() + (daynum * 24 * 60 * 60 * 1000)), doc['timezone']);
    const events = schedule.getEventsFor({
      date: day, group,
      electives: await storage.getUserElectives(msg.chat.id),
    });
    if (events === undefined || events?.length === 0) {
      text += `${day.toDateString()} No events \n`;
    } else {
      text += `${wrapEventsFor(events, day)}\n`;
    }
  }
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

const callback_processers = {
/**
  * @type {(bot:TelegramBot) => (callbackQuery:import("node-telegram-bot-api").CallbackQuery) => Promise}
  */
  [keyboard.electiveButtonRegexp]: (bot) => async (callbackQuery) => {
    const elected = RegExp(keyboard.electiveButtonRegexp)
      .exec(callbackQuery.data)[1]
    const userId = callbackQuery.from.id
    const alreadyElected = await storage.getUserElectives(userId)
    if (alreadyElected.includes(elected)) {
      await storage.removeUserElective(userId, elected)
    } else {
      await storage.addUserElective(userId, elected)
    }
    const group = await storage.getUserGroup(userId)
    bot.answerCallbackQuery(callbackQuery.id);
    bot.editMessageReplyMarkup({
      inline_keyboard: keyboard.buildElectivesKeyboard(group, await storage.getUserElectives(userId))
    }, {
      chat_id: userId,
      message_id: callbackQuery.message.message_id
    })
  },

/**
  * @type {(bot:TelegramBot) => (callbackQuery:import("node-telegram-bot-api").CallbackQuery) => Promise}
  */
  [keyboard.groupsButtonRegexp]: (bot) => async (callbackQuery) => {
    const chosen = RegExp(keyboard.groupsButtonRegexp)
      .exec(callbackQuery.data)[1];
    const userId = callbackQuery.from.id
    const userGroup = await storage.getUserGroup(userId)
    if (userGroup === chosen) {
      await storage.deleteUserGroup(userId)
    } else {
      await storage.setUserGroup(userId, chosen)

      const allElectives = await storage.getUserElectives(userId)
      for (const elective of allElectives) {
        await storage.removeUserElective(userId, elective)
      }

      bot.sendMessage(userId, `Choose your electives now:`, {
        reply_markup: {
          inline_keyboard: keyboard.buildElectivesKeyboard(chosen),
        }
      });
    }


    bot.answerCallbackQuery(callbackQuery.id);
    bot.editMessageReplyMarkup({
      inline_keyboard: keyboard.buildGroupsKeyboard([chosen])
    }, {
      chat_id: callbackQuery.from.id,
      message_id: callbackQuery.message.message_id
    })
  },
}

function addCommands(bot) {
  bot.onText(/\/start/, onStart(bot));

  bot.onText(/\/today/, today(bot));
  bot.onText(/\/tomorrow/, tomorrow(bot));
  bot.onText(/\/nextweek/, nextWeek(bot));
  bot.onText(/\/week/, thisWeek(bot));
  bot.onText(/\/group/, group(bot));

  bot.on('callback_query', async (callbackQuery) => {
    for (const r of Object.keys(callback_processers)) {
      if (RegExp(r).test(callbackQuery.data)) {
        callback_processers[r](bot)(callbackQuery);
      }
    }
  });
}

module.exports = {
  addCommands,
}
