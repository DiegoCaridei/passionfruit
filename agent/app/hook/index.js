/*
 * common hook
 */

require('./cccrypt')

const { echo } = require('../lib/utils')

const subject = 'hook'

const hooked = {}
const swizzled = {}

const readable = (type, arg) => (type === 'char *' ? Memory.readUtf8String(arg) : arg)


function hook(library, func, signature) {
  const funcPtr = Module.findExportByName(library, func)
  if (!funcPtr)
    throw new Error('symbol not found')

  let lib = library
  if (!library) {
    const mod = Process.getModuleByAddress(funcPtr)
    lib = mod.name
  }

  if (hooked[lib] && hooked[lib][func])
    return true

  const intercept = Interceptor.attach(funcPtr, {
    onEnter(args) {
      const pretty = []
      for (let i = 0; i < signature.args.length; i++) {
        const arg = ptr(args[i])
        pretty[i] = readable(signature.args[i], arg)
      }

      const expr = `${lib}!${func}(${args.join(', ')})`.substr(0, 100)
      echo.call(this, subject, 'call', { args: pretty, lib, func, expr })
    },
    onLeave(retVal) {
      if (!signature.ret) return
      const ret = readable(signature.ret, retVal)
      const expr = `=${ret}`
      echo.call(this, subject, 'return', { lib, func, ret, expr })
    },
  })

  if (!hooked[lib])
    hooked[lib] = { [func]: intercept }
  else
    hooked[lib][func] = intercept

  return true
}

function unhook(lib, func) {
  if (hooked[lib]) {
    const intercept = hooked[lib][func]
    if (intercept) {
      intercept.detach()
      delete hooked[lib][func]
      return true
    }
  }

  throw new Error('function has not been hooked before')
}


function swizzle(clazz, sel, traceResult = true) {
  if (swizzled[clazz] && swizzled[clazz][sel])
    return true

  if (!ObjC.classes[clazz])
    throw new Error(`class ${clazz} not found`)

  if (!ObjC.classes[clazz][sel])
    throw new Error(`method ${sel} not found in ${clazz}`)

  const method = ObjC.classes[clazz][sel]
  let onLeave
  if (traceResult) {
    onLeave = (retVal) => {
      let ret = retVal
      try {
        ret = new ObjC.Object(ret).toString()
      } catch (ignored) {
        //
      }
      const expr = `=${ret}`
      echo.call(this, subject, 'objc-return', { clazz, sel, ret, expr })
    }
  }

  const intercept = Interceptor.attach(method.implementation, {
    onEnter(args) {
      const readableArgs = []
      for (let i = 2; i < method.argumentTypes.length; i++) {
        if (method.argumentTypes[i] === 'pointer') {
          try {
            const obj = ObjC.Object(args[i]).toString()
            readableArgs.push(obj)
          } catch (ex) {
            readableArgs.push(args[i])
          }
        } else {
          readableArgs.push(args[i])
        }
      }
      const expr = `${clazz}!${sel}(${readableArgs.join(', ')})`.substr(0, 100)
      echo.call(this, subject, 'objc-call', { args: readableArgs, clazz, sel, expr })
    },
    onLeave,
  })

  if (!swizzled[clazz])
    swizzled[clazz] = { [sel]: intercept }
  else
    swizzled[clazz][sel] = intercept

  return true
}

function unswizzle(clazz, sel) {
  if (swizzled[clazz]) {
    const intercept = swizzled[clazz][sel]
    if (intercept) {
      intercept.detach()
      delete swizzled[clazz][sel]
      return true
    }
  }

  throw new Error(`method ${sel} of ${clazz} has not been swizzled`)
}

module.exports = {
  hook,
  unhook,
  swizzle,
  unswizzle,
}
