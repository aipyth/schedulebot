const utils = require('../src/utils')

describe('repeatWhile', () => {
  it('executes the callback until the statement is true', (done) => {
    let counter = 0
    const statement = () => counter >= 5
    const cb = (res) => {
      counter++
    }

    const repeatWhile = utils.repeatWhile(100)
    repeatWhile
      .if(statement)
      .then(cb)
      .atSeconds(0)
      .run()

    setTimeout(() => {
      assert.strictEqual(counter, 5)
      done()
    }, 600)
  })
})
