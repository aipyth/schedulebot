module.exports = {
    
    repeatWhile(timeout) {
        this.then = (cb) => this.cb = cb
        this.if = (statement) => {
            this.statement = statement
            return this
        }
        const interval = setInterval(() => {
            try {
                if(this.statement) {
                    this.cb(() => clearInterval(interval))
                }
            } catch(err) {
                this.cb(interval, err)
            }
        }, timeout)
        return this
    }
}
