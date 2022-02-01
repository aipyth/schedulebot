const TelegramBot = require('node-telegram-bot-api');
const yaml = require('js-yaml');
const fs = require('fs');

// Load schedule document
// try {
    const doc = yaml.load(fs.readFileSync('./schedule.yml', 'utf8'));
    console.log(doc);
    // console.log(doc.timings)
    // console.log(doc.week1.monday)
// } catch (e) {
//     throw e;
// }

const weekdaysint = {
    '1': "monday",
    '2': "tuesday",
    '3': "wednesday",
    '4': "thursday",
    '5': "friday",
    '6': "saturday",
}

function weeksBetween(d1, d2) {
    return (d2 - d1) / (7 * 24 * 60 * 60 * 1000);
}

function getWeekNumber(d) {
    return Math.floor(weeksBetween(new Date(doc['start-date']), d) % doc['weekn']) + 1;
}

function getDateEvents(time) {
    const localized = new Date(time.getTime() + doc['timezone-delta'] * 60 * 60000);
    const weekNum = getWeekNumber(localized); 
    const weekdays = doc['week' + weekNum];
    const day = weekdaysint[localized.getDay().toString()];
    return weekdays[day];
}

console.log(new Date().getTimezoneOffset())
console.log("Day today: ", new Date());
console.log("Events today: ", getDateEvents(new Date()));
console.log("Events on next friday: " , getDateEvents(new Date("Fri Feb 11 2022")));


const token = process.env.BOT_TOKEN;
if (token == undefined) { throw "Invalid environment variable BOT_TOKEN"; }

const bot = new TelegramBot(token, {polling: true});


bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  bot.sendMessage(chatId, resp);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Received your message');
});

const sleep = () => new Promise(resolve: () => setTimeout ) {
    
}

setTimeout()
