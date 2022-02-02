module.exports = {
    repeatWhile(timeout) {
        this.then = (cb) => {
            this.cb = cb
            this.func()
        }
        this.if = (statement) => {
            this.statement = statement
            return this
        }
        this.func = () => {
            let res;
            try {
                res = this.statement()
                console.log('repeatWhile condition', res);
                if (res) {
                    // this.cb(res, () => clearInterval(interval))
                    this.cb(res)
                }
            } catch(err) {
                console.log(err);
                // this.cb(res, interval, err)
            }
        }
        const interval = setInterval(this.func, timeout)
        return this
    }
}
