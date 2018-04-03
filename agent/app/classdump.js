/* eslint camelcase:0, no-cond-assign:0 */

function getClassesFromModule(path) {
  const free = new NativeFunction(Module.findExportByName(null, 'free'), 'void', ['pointer'])
  const objc_copyClassNamesForImage = new NativeFunction(
    Module.findExportByName(null, 'objc_copyClassNamesForImage'), 'pointer', ['pointer', 'pointer'])
  const p = Memory.alloc(Process.pointerSize)
  Memory.writeUInt(p, 0)
  const pPath = Memory.allocUtf8String(path)
  const pClasses = objc_copyClassNamesForImage(pPath, p)
  const count = Memory.readUInt(p)
  const classes = new Array(count)
  for (let i = 0; i < count; i++) {
    const pClassName = Memory.readPointer(pClasses.add(i * Process.pointerSize))
    classes[i] = Memory.readUtf8String(pClassName)
  }
  free(pClasses)
  return classes
}

function getOwnModules() {
  function normalize(path) {
    return path.replace(/^\/private\/var\//, '/var/')
  }

  const bundle = normalize(ObjC.classes.NSBundle.mainBundle().bundlePath().toString())
  return Process.enumerateModulesSync().filter(module =>
    module.path && normalize(module.path).indexOf(bundle) === 0)
}

function getOwnClasses(sort) {
  // todo: filter by module
  // return a dict
  let results = []
  for (const mod of getOwnModules()) {
    const classes = getClassesFromModule(mod.path)
    results = results.concat(classes)
  }

  return sort ? results.sort() : results
}

function getGlobalClasses(sort) {
  const classes = Object.keys(ObjC.classes)
  return sort ? classes.sort() : classes
}

let ownClasses = null
let globalClasses = null

exports.getOwnModules = getOwnModules

exports.ownClasses = () => {
  if (!ownClasses)
    ownClasses = getOwnClasses(true)
  return ownClasses
}

exports.classes = () => {
  if (!globalClasses)
    globalClasses = getGlobalClasses(true)

  return globalClasses
}

exports.modules = () => Process.enumerateModulesSync()

exports.exports = name => Module.enumerateExportsSync(name)

exports.inspect = (clazz, allMethods) => {
  const proto = []
  let clz = ObjC.classes[clazz]
  if (!clz)
    throw new Error(`class ${clazz} not found`)

  while (clz = clz.$superClass)
    proto.unshift(clz.$className)

  clz = ObjC.classes[clazz]
  return {
    methods: allMethods ? clz.$ownMethods : clz.$methods,
    proto,
  }
}
