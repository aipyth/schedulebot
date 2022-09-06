const { createClient } = require("redis");

const rds = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
});

rds.on('error', (err) => console.error('Redis Client Error', err));


const electedEventsKey = 'elected:';
const usersKey = 'users';
const userGroupKey = 'usergroup:';

const storage = {
  async connect() {
    return rds.connect()
  },

  /** @param {string | number} chatId */
  async getUserGroup(chatId) {
    const group = await rds.get(userGroupKey + chatId);
    return group },

  /** @param {string | number} userId */
  async deleteUserGroup(userId) {
    return await rds.del(userGroupKey + userId);
  },

  /** @param {string | number} userId
   *  @param {string} group
   */
  async setUserGroup(userId, group) {
    return rds.set(userGroupKey + userId, group)
  },

  /** @param {string | number} userId
   *  @param {string} name
   */
  async hasUserElected(userId, name) {
    const choose = await rds.sIsMember(electedEventsKey + userId, name);
    return choose
  },

  /** @param {string | number} userId
   *  @param {string} elective
   */
  async addUserElective(userId, elective) {
    return rds.sAdd(electedEventsKey + userId, elective)
  },

  /** @param {string | number} userId
   *  @param {string} elective
   */
  async removeUserElective(userId, elective) {
    return rds.sRem(electedEventsKey + userId, elective)
  },

  /** @param {string | number} userId
   */
  async getUserElectives(userId) {
    const alreadyElected = await rds.sMembers(electedEventsKey + userId);
    return alreadyElected
  },

  /** @param {string | number} userId
   */
  async addUser(userId) {
    const result = await rds.sAdd(usersKey, userId.toString())
    return result
  },

  async getAllUsers() {
    return rds.sMembers(usersKey)
  },
}

module.exports = storage
