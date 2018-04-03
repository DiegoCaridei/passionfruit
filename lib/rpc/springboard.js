const Handler = require('./base')


module.exports = class SpringBoardHandler extends Handler {
  constructor(session, socket) {
    super()

    this.session = session
    this.socket = socket
    this.handleMessage()
  }

  async load() {
    const { socket } = this
    const script = await this.getAgent('springboard')
    await script.load()
    script.destroyed.connect(() => {
      socket.emit('script_destroyed')
      socket.disconnect(true)
    })
    script.message.connect((message, data) => {
      if (message.type === 'error')
        this.handleError(message, data)
    })

    this.script = script
    this.agent = await script.getExports()
  }

  handleMessage() {
    [
      'uiopen',
      'urls',
    ].forEach(event => this.socket.on(event, this.wrap(event)))
  }

  async urls() {
    return this.agent.urls()
  }

  async uiopen(url) {
    return this.agent.uiopen(url)
  }
}
