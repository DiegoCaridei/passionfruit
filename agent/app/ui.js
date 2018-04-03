import { echo } from './lib/utils'

const { UIDebuggingInformationOverlay, LAContext, UIWindow } = ObjC.classes

function dumpWindow() {
  return UIWindow.keyWindow().recursiveDescription().toString()
}

let originalImplementation = null


function toggleTouchID(enable) {
  const subject = 'touchid'
  if (!LAContext)
    throw new Error('Touch ID may not be supported by this device')

  const method = LAContext['- evaluatePolicy:localizedReason:reply:']
  if (originalImplementation && enable) {
    method.implementation = originalImplementation
    originalImplementation = null

    echo(subject, 'enable', { reason: 're-eanbled touch id' })
  } else if (!originalImplementation && !enable) {
    originalImplementation = method.implementation
    method.implementation = ObjC.implement(method, (self, sel, policy, reason, reply) => {
      echo(subject, 'request')
      // dismiss the dialog
      const callback = new ObjC.Block(ptr(reply))
      callback.implementation(1, null)
    })

    echo(subject, 'off', { reason: 'successfully disabled touch id' })
  } else {
    throw new Error('invalid on/off argument')
  }
}

let overlay = null
function toggleDebugOverlay() {
  const p = Module.findExportByName('CoreFoundation', 'kCFCoreFoundationVersionNumber')
  const version = Memory.readDouble(p)

  if (version < 1300)
    throw new Error(`iOS version ${version} lower than expected, the feature is unavailable`)

  ObjC.schedule(ObjC.mainQueue, () => {
    if (overlay === null) {
      UIDebuggingInformationOverlay.prepareDebuggingOverlay()
      overlay = UIDebuggingInformationOverlay.overlay()
    }
    overlay.toggleVisibility()
  })
}

module.exports = {
  dumpWindow,
  toggleTouchID,
  toggleDebugOverlay,
}
