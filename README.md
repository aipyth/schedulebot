# Schedule Bot
Telegram Bot to notify user about upcoming schedule events.

## Current usage
Currently this bot is used in telegram as [student's IPT schedule bot](https://t.me/scheduleIPT_bot).
The bot sends all the users their classes *one minute before* the lesson. Also commands `/today`, `/tomorrow`, `/week`, `/nextweek` are available.

**Feel free to create issues to offer new features and updates.**

## How to add the schedule of my group to the [bot](https://t.me/scheduleIPT_bot)?
1. Fork the repository
2. Read about [yaml syntax](https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html)
3. Open `bot/schedule.yml` file
    1. Add the name of your group to `groups` list
    2. Create new key with the name of your group where your schedule will be stored
    3. Add two keys to the last one: `week1` and `week2`
    4. Add days of week from `monday` to `saturday` to each of these weeks
    5. Now each day is an array of dictionaries with the name of the course and it's keys and values are
        1. `type` - the type of class at the time
        2. `elective` - boolean respesenting whether this course is elective or not
        3. `link` - link to the meeting (also you can specify here additional infomation besides the link)
    6. The first element in the last array represents first class, second -- second and so on...
    7. If you have an opening at the time just write `Opening` instead of specific dictionary
