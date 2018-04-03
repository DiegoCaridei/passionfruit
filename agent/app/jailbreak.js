import { echo } from './lib/utils'

const paths = `/Applications/Cydia.app
/Applications/FakeCarrier.app
/Applications/Icy.app
/Applications/IntelliScreen.app
/Applications/MxTube.app
/Applications/RockApp.app
/Applications/SBSettings.app
/Applications/WinterBoard.app
/Applications/blackra1n.app
/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist
/Library/MobileSubstrate/DynamicLibraries/Veency.plist
/Library/MobileSubstrate/MobileSubstrate.dylib
/System/Library/LaunchDaemons/com.ikey.bbot.plist
/System/Library/LaunchDaemons/com.saurik.Cydia.Startup.plist
/bin/bash
/bin/sh
/etc/apt
/etc/ssh/sshd_config
/private/var/lib/apt
/private/var/lib/cydia
/private/var/mobile/Library/SBSettings/Themes
/private/var/stash
/private/var/tmp/cydia.log
/usr/bin/sshd
/usr/libexec/sftp-server
/usr/libexec/ssh-keysign
/usr/sbin/sshd
/var/cache/apt
/var/lib/apt
/private/jailbreak.txt
/var/lib/cydia`.split('\n')

const subject = 'jailbreak'

export default function bypassJailbreak() {
  /* eslint no-param-reassign: 0, camelcase: 0, prefer-destructuring: 0 */
  Interceptor.attach(Module.findExportByName(null, 'open'), {
    onEnter(args) {
      if (!args[0])
        return

      const path = Memory.readUtf8String(args[0])
      if (paths.indexOf(path) > -1) {
        echo.call(this, subject, 'detect', {
          arguments: {
            path,
            method: 'open',
          },
        })
        args[0] = NULL
      }
    },
  })

  Interceptor.attach(Module.findExportByName(null, 'stat'), {
    onEnter(args) {
      if (!args[0])
        return

      const path = Memory.readUtf8String(args[0])
      if (paths.indexOf(path) > -1) {
        echo.call(subject, 'detect', { arguments: { path, method: 'stat' } })
        args[0] = NULL
      }
    },
  })

  Interceptor.attach(Module.findExportByName(null, 'getenv'), {
    onEnter(args) {
      const key = Memory.readUtf8String(args[0])
      if (key === 'DYLD_INSERT_LIBRARIES') {
        echo.call(this, subject, 'detect', { arguments: { func: 'getenv', env: 'DYLD_INSERT_LIBRARIES' }})
        args[0] = NULL
      }
    },
  })

  Interceptor.attach(Module.findExportByName(null, '_dyld_get_image_name'), {
    onLeave(retVal) {
      if (Memory.readUtf8String(retVal).indexOf('MobileSubstrate') > -1) {
        echo.call(this, subject, 'detect', { func: '_dyld_get_image_name' })
        retVal.replace(NULL)
      }
    },
  })

  Interceptor.attach(Module.findExportByName(null, 'fork'), {
    onLeave(retVal) {
      echo.call(this, subject, 'detect', { func: 'fork' })
      retVal.replace(ptr(-1))
    },
  })

  const { UIApplication, NSURL, NSString, NSError, NSFileManager } = ObjC.classes
  const canOpenURL_publicURLsOnly_ = UIApplication['- _canOpenURL:publicURLsOnly:']
  Interceptor.attach(canOpenURL_publicURLsOnly_.implementation, {
    onEnter(args) {
      if (args[2].isNull())
        return

      const url = ObjC.Object(args[2]).toString()
      if (/^cydia:\/\//i.exec(url)) {
        args[2] = NSURL.URLWithString_('invalid://')
        this.shouldOverride = true
        echo.call(this, subject, 'detect', { func: 'canOpenURL:', url })
      }
    },
    onLeave(retVal) {
      if (this.shouldOverride)
        retVal.replace(NULL)
    },
  })

  Interceptor.attach(NSFileManager['- fileExistsAtPath:'].implementation, {
    onEnter(args) {
      if (args[2].isNull())
        return

      const path = new ObjC.Object(args[2]).toString()
      if (paths.indexOf(path) > -1) {
        echo.call(this, 'detect', { func: 'fileExistsAtPath:', path })
        this.shouldOverride = true
      }
    },
    onLeave(retVal) {
      if (this.shouldOverride)
        retVal.replace(NULL)
    },
  })

  Interceptor.attach(NSString['- writeToFile:atomically:encoding:error:'].implementation, {
    onEnter(args) {
      if (args[2].isNull())
        return

      const path = ObjC.Object(args[2]).toString()
      if (path.match(/^\/private/)) {
        echo.call(this, subject, 'detect', { func: 'writeToFile:', path })
        this.shouldOverride = true
        this.error = args[5]
      }
    },
    onLeave() {
      if (this.shouldOverride)
        Memory.writePointer(this.error, NSError.alloc())
    },
  })
}
