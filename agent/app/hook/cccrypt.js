const { echo } = require('../lib/utils')

const btoa = buf => Duktape.enc('base64', buf)

const CCOperation = ['kCCEncrypt', 'kCCDecrypt']
const CCAlgorithm = [
  { name: 'kCCAlgorithmAES128', blocksize: 16 },
  { name: 'kCCAlgorithmDES', blocksize: 8 },
  { name: 'kCCAlgorithm3DES', blocksize: 8 },
  { name: 'kCCAlgorithmCAST', blocksize: 8 },
  { name: 'kCCAlgorithmRC4', blocksize: 8 },
  { name: 'kCCAlgorithmRC2', blocksize: 8 },
]

const subject = 'crypto'


const handlers = {
  // CCCryptorStatus
  // CCCryptorCreate(CCOperation op, CCAlgorithm alg, CCOptions options,
  //     const void *key, size_t keyLength, const void *iv,
  //     CCCryptorRef *cryptorRef);

  CCCryptorCreate: {
    onEnter(args) {
      const op = args[0].toInt32()
      const alg = args[1].toInt32()
      // const options = args[2].toInt32()
      const key = args[3]
      const keyLength = args[4].toInt32()
      const iv = args[5]

      const strKey = btoa(Memory.readByteArray(key, keyLength))
      const strIV = iv === 0 ? 'null' : btoa(Memory.readByteArray(iv, CCAlgorithm[alg].blocksize))

      let operation = CCOperation[op]
      if (operation === 'kCCEncrypt')
        operation = 'encrypt'
      else if (operation === 'kCCDecrypt')
        operation = 'decrypt'

      echo.call(this, subject, operation, {
        func: 'CCCryptorCreate',
        arguments: {
          operation,
          algorithm: CCAlgorithm[alg].name,
          key: strKey,
          iv: strIV,
        },
      })
    },
  },

  // CCCryptorStatus
  // CCCrypt(CCOperation op, CCAlgorithm alg, CCOptions options,
  //     const void *key, size_t keyLength, const void *iv,
  //     const void *dataIn, size_t dataInLength, void *dataOut,
  //     size_t dataOutAvailable, size_t *dataOutMoved);

  CCCrypt: {
    onEnter(args) {
      const op = args[0].toInt32()
      const alg = args[1].toInt32()
      // const options = args[2].toInt32()
      const key = args[3]
      const keyLength = args[4].toInt32()
      const iv = args[5]
      const dataIn = args[6]
      const dataInLength = args[7].toInt32()
      const dataOut = args[8]
      const dataOutAvailable = args[9]
      const dataOutMoved = args[10]

      this.dataOut = dataOut
      this.dataOutAvailable = dataOutAvailable
      this.dataOutMoved = dataOutMoved

      const strKey = btoa(Memory.readByteArray(key, keyLength))
      const strIV = iv === 0 ? 'null' : btoa(Memory.readByteArray(iv, CCAlgorithm[alg].blocksize))

      const strDataIn = btoa(Memory.readByteArray(dataIn, dataInLength))

      let operation = CCOperation[op]
      if (operation === 'kCCEncrypt')
        operation = 'encrypt'
      else if (operation === 'kCCDecrypt')
        operation = 'decrypt'

      this.operation = operation

      echo.call(this, subject, operation, {
        func: 'CCCrypt',
        arguments: {
          operation,
          algorithm: CCAlgorithm[alg].name,
          key: strKey,
          iv: strIV,
          in: strDataIn,
        },
      })
    },
    onLeave(retVal) {
      if (retVal.toInt32() !== 0)
        return

      const { dataOut, dataOutMoved, operation } = this
      const len = Memory.readUInt(dataOutMoved)
      const strDataOut = btoa(Memory.readByteArray(dataOut, len))

      echo(subject, operation, { out: strDataOut })
    },
  },
}


let hooks = []
export default function toggle(on) {
  if (on && !hooks.length) {
    for (const func in handlers) {
      if (({}).hasOwnProperty.call(handlers, func))
        hooks.push(Interceptor.attach(Module.findExportByName(null, func), handlers[func]))
    }
  }

  if (!on && hooks.length) {
    hooks.forEach(hook => hook.detach())
    hooks = []
  }
}
