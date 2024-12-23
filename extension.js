import GObject from 'gi://GObject'
import St from 'gi://St'
import Soup from 'gi://Soup'
import GLib from 'gi://GLib'
import Gio from 'gi://Gio'

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

let settings = null

class Indicator extends PanelMenu.Button {
  static {
    GObject.registerClass(this)
  }

  _init() {
    super._init(0.0, _('Mihomo Tray'))

    if (settings !== null) {
      this._externalController = settings.get_string('external-controller') || null
      this._metacubexdUrl = settings.get_string('dashboard-url') || null
      this._handlerId0 = settings.connect('changed::external-controller', (settings, key) => {
        this._externalController = settings.get_string(key) || null
      })
      this._handlerId1 = settings.connect('changed::dashboard-url', (settings, key) => {
        this._metacubexdUrl = settings.get_string(key) || null
      })
    }

    const prefItem = new PopupMenu.PopupMenuItem('Preferences')
    this._handlerId2 = prefItem.connect('activate', () => this.openPrefs())
    this.menu.addMenuItem(prefItem)

    const separator = new PopupMenu.PopupSeparatorMenuItem()
    this.menu.addMenuItem(separator)

    const openMetacubeXDItem = new PopupMenu.PopupMenuItem('Open Dashboard')
    this._handlerId3 = openMetacubeXDItem.connect('activate', () => this._openMetacubeXD())
    this.menu.addMenuItem(openMetacubeXDItem)

    const reloadItem = new PopupMenu.PopupMenuItem('Reload Configuration')
    this._handlerId4 = reloadItem.connect('activate', () => this._reloadConfiguration())
    this.menu.addMenuItem(reloadItem)

    this._httpSession = new Soup.Session()
    this._fetchConfigs()

    this.cleanSignals = () => {
      if (settings) {
        if (this._handlerId0) {
          settings.disconnect(this._handlerId0)
          this._handlerId0 = null
        }
        if (this._handlerId1) {
          settings.disconnect(this._handlerId1)
          this._handlerId1 = null
        }
      }
      if (prefItem && this._handlerId2) {
        prefItem.disconnect(this._handlerId2)
        this._handlerId2 = null
      }
      if (openMetacubeXDItem && this._handlerId3) {
        openMetacubeXDItem.disconnect(this._handlerId3)
        this._handlerId3 = null
      }
      if (openMetacubeXDItem && this._handlerId4) {
        openMetacubeXDItem.disconnect(this._handlerId4)
        this._handlerId4 = null
      }
      if (this._allowLanItem && this._handlerId5) {
        this._allowLanItem.disconnect(this._handlerId5)
        this._handlerId5 = null
      }
    }
  }

  _fetch({ method, url, resolve, reject = console.error, body = null }) {
    const message = Soup.Message.new(method, url)

    if (body !== null) {
      const bytes = new TextEncoder().encode(JSON.stringify(body))
      message.set_request_body_from_bytes('application/json', new GLib.Bytes(bytes))
    }

    this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
      try {
        const bytes = session.send_and_read_finish(result)
        const response = new TextDecoder('utf-8').decode(bytes)
        resolve(response)
      } catch (err) {
        reject(err)
      }
    })
  }

  _fetchConfigs() {
    if (!this._externalController) {
      console.error('\n\external controller is null\n\n')
      return
    }

    this._fetch({
      method: 'GET',
      url: `${this._externalController}/configs`,
      resolve: res => {
        const configs = JSON.parse(res)
        const items = []

        if (configs.hasOwnProperty('allow-lan')) {
          this._allowLanItem = new PopupMenu.PopupMenuItem('Allow Lan: ' + (configs['allow-lan'] ? 'ON' : 'OFF'))
          const onAllowLanChanged = value => {
            this._allowLanItem.label.text = 'Allow Lan: ' + (value ? 'ON' : 'OFF')
            configs['allow-lan'] = value
          }
          this._handlerId5 = this._allowLanItem.connect('activate', () => this._changeAllowLan(!configs['allow-lan'], onAllowLanChanged))
          items.push(this._allowLanItem)
        }

        if (configs.hasOwnProperty('mode')) {
          const item = new PopupMenu.PopupSubMenuMenuItem('Mode: ' + configs['mode'].toUpperCase())
          const onModeChanged = newMode => { item.label.text = 'Mode: ' + newMode.toUpperCase() }
          item.menu.addAction('GLOBAL', () => this._changeMode('Global', onModeChanged))
          item.menu.addAction('RULE', () => this._changeMode('Rule', onModeChanged))
          item.menu.addAction('DIRECT', () => this._changeMode('Direct', onModeChanged))
          items.push(item)
        }

        if (items.length !== 0) {
          const separator = new PopupMenu.PopupSeparatorMenuItem()
          this.menu.addMenuItem(separator)
        }

        items.forEach(item => this.menu.addMenuItem(item))
      },
      reject: err => {
        console.error(err)
        Main.notify('Mihomo Tray', 'Failed to fetch configs, please check the status of mihomo service.')
      }
    })
  }

  _openMetacubeXD() {
    if (!this._metacubexdUrl) {
      console.error('dashboard url is null')
      return
    }
    try {
      Gio.AppInfo.launch_default_for_uri_async(this._metacubexdUrl, null, null, () => { })
    } catch (e) {
      console.error(`${e}`)
    }
  }

  _changeMode(mode, onSuccess) {
    if (this._externalController === null) {
      console.error('external controller is null')
      return
    }
    this._fetch({
      method: 'PATCH',
      url: `${this._externalController}/configs`,
      body: { mode },
      resolve: () => {
        Main.notify('Mihomo Tray', `Proxy mode changed to ${mode}.`)
        onSuccess(mode)
      }
    })
  }

  _changeAllowLan(allowLan, onSuccess) {
    if (this._externalController === null) {
      console.error('external controller is null')
      return
    }
    this._fetch({
      method: 'PATCH',
      url: `${this._externalController}/configs`,
      body: { 'allow-lan': allowLan },
      resolve: () => {
        Main.notify('Mihomo Tray', `Allow Lan: ${allowLan ? 'ON' : 'OFF'}`)
        onSuccess(allowLan)
      }
    })
  }

  _reloadConfiguration() {
    this._fetch({
      method: 'PUT',
      url: `${this._externalController}/configs`,
      resolve: () => {
        Main.notify('Mihomo Tray', `Configuration reloded.`)
      },
      reject: (err) => {
        console.error(err)
        Main.notify('Mihomo Tray', `Failed to relod configuration.`)
      },
    })
  }

  destroyHttpSession() {
    if (this._httpSession) {
      this._httpSession.abort()
      this._httpSession = null
    }
  }
}

export default class MihomoTrayExtension extends Extension {
  enable() {
    settings = this.getSettings('org.gnome.shell.extensions.mihomotray')

    const clashIcon = new St.Icon({ gicon: Gio.icon_new_for_string(this.metadata.path + '/clash.svg') })
    clashIcon.set_icon_size(16)
    this._indicator = new Indicator()
    this._indicator.add_child(clashIcon)
    this._indicator.openPrefs = () => this.openPreferences()

    Main.panel.addToStatusArea(this.uuid, this._indicator)
  }

  disable() {
    if (this._indicator.cleanSignals) {
      this._indicator.cleanSignals()
    }
    this._indicator.destroyHttpSession()
    this._indicator.destroy()
    this._indicator = null
    settings = null
  }
}
