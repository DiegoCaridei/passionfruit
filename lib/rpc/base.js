const fs = require('fs')
const path = require('path')

const { promisify } = require('util')

const readFile = promisify(fs.readFile)


module.exports = class Handler {
  constructor(session, socket) {
    this.session = session
    this.socket = socket
  }

  wrap(key) {
    const method = this[key].bind(this)
    return async(data, ack) => {
      try {
        ack({
          status: 'ok',
          data: await method(data),
        })
      } catch (err) {
        console.error('Uncaught RPC', err.stack || err)
        console.error('method:', key, 'args:', data)
        ack({
          status: 'error',
          error: `${err}`,
        })
      }
    }
  }

  handleError(message, error) {
    console.error('error message from frida')
    console.error(message.stack || message)
    console.error(error)
  }

  async getAgent(name) {
    const prefix = path.join(__dirname, '..', '..', 'agent', `${name}.bundle`)
    if (process.env.NODE_ENV === 'development') {
      const source = await readFile(`${prefix}.js`, 'utf8')
      return this.session.createScript(source)
    }
    const bytes = await readFile(`${prefix}.bin`)
    return this.session.createScriptFromBytes(bytes)
  }
}
