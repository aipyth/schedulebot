module.exports = {
  repeatWhile(timeout) {
    this.till = () => 0
    this.then = (cb) => {
      this.cb = cb
      return this
    }
    this.if = (statement) => {
      this.statement = statement
      return this
    }
    this.func = () => {
      let res
      try {
        res = this.statement()
        if (res) {
          console.log(`repeatWhile condition ${res} at ${new Date()}`)
          this.cb(res)
        }
      } catch (err) {
        console.error(err)
      }
    }
    this.atSeconds = (seconds) => {
      this.till = () => {
        const now = new Date()
        const millisTill = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), seconds % 60, 0) - now
        console.log('till', millisTill, millisTill + 1000 * 60)
        return millisTill < 0 ? millisTill + 1000 * 60 : millisTill
      }
      return this
    }
    this.run = () => {
      setTimeout(() => {
        this.func()
        this.interval = setInterval(this.func, timeout)
      }, this.till())
    }
    return this
  },
}
