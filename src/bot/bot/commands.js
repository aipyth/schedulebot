const TelegramBot = require("node-telegram-bot-api");

const schedule = require('../schedule');
const keyboard = require('./keyboard');
const storage = require('../storage');

const repoLink = 'https://github.com/aipyth/schedulebot';

/**
  * @param {TelegramBot.ChatId} chatId
  */
const askGroup = (bot) => async (chatId) => {
  const group = await storage.getUserGroup(chatId)
  bot.sendMessage(chatId, `Lets choose your group:`, {
    reply_markup: {
      inline_keyboard: group
        ? keyboard.buildGroupsKeyboard([group])
        : keyboard.buildGroupsKeyboard(),
    }
  });
}

const wrapEvents = async (events, userId) => {
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
      try {
        const choose = await storage.hasUserElected(userId, name)
        eventName = choose ||
          !(events[i][name]['elective'])
            ? `${name} – ${events[i][name]['type']}`
            : "";
      } catch (e) {
        console.log(e);
        // bot.sendMessage(msg.chat.id, `Error gettings your electives.`);
        return text
      }
    } 
    text += `${tmgs[i]}\t ${eventName} \n`;
  }
  return text;
}

/**
  * @param {TelegramBot.Message} msg
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
    bot.sendMessage(chatId, `Could not add you to database.`);
  }
}

const group = (bot) => async (msg) => {
  const chatId = msg.chat.id
  // console.log(chatId)
  await storage.deleteUserGroup(chatId)
  await askGroup(bot)(chatId);
}

/**
  * @param {TelegramBot.Message} msg
  */
const today = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }

  const today = new Date();
  const events = schedule.getDateEvents(today, group);
  if (events === undefined) {
    bot.sendMessage(msg.chat.id, `No events for today`);
    return;
  }
  const text = await wrapEvents(events, msg.chat.id);
  console.log(`text ${text}`);
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

/**
  * @param {TelegramBot.Message} msg
  */
const tomorrow = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }

  const tomorrow = new Date(new Date().getTime() + (24 * 60 * 60 * 1000));
  const events = schedule.getDateEvents(tomorrow, group);
  if (events == undefined) {
    bot.sendMessage(msg.chat.id, `No events for tomorrow`);
    return;
  }
  const text = await wrapEvents(events, msg.chat.id);
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

/**
  * @param {TelegramBot.Message} msg
  */
const nextWeek = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }

  const today = new Date();
  const shift = (8 - today.getDay()) % 8;
  let text = '';
  for (let daynum = 0; daynum < 7; daynum++) {
    const day = new Date(today.getTime() + ((shift + daynum) * 24 * 60 * 60 * 1000));
    const events = schedule.getDateEvents(day, group);
    if (events == undefined) {
      text += `${day.toDateString()} No events \n`;
    } else {
      text += `***${day.toDateString()}*** \n${await wrapEvents(events, msg.chat.id)} \n`;
    }
  }
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

/**
  * @param {TelegramBot.Message} msg
  */
const thisWeek = (bot) => async (msg) => {
  const group = await storage.getUserGroup(msg.chat.id)
  if (!group) {
    bot.sendMessage(msg.chat.id, `You haven't set your group`);
    await askGroup(bot)(msg.chat.id);
    return;
  }

  const today = new Date();
  const shift = (8 - today.getDay()) % 8;
  let text = '';
  for (let daynum = 0; daynum < shift; daynum++) {
    const day = new Date(today.getTime() + (daynum * 24 * 60 * 60 * 1000));
    const events = schedule.getDateEvents(day, group);
    if (events == undefined) {
      text += `${day.toDateString()} No events \n`;
    } else {
      text += `***${day.toDateString()}*** \n${await wrapEvents(events, msg.chat.id)} \n`;
    }
  }
  bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
  });
}

const callback_processers = {
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
