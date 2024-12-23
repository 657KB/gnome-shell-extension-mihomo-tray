import Gio from 'gi://Gio'
import Adw from 'gi://Adw'

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class MihomoTrayPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage({
      title: 'Mihomo Tray Perferences',
      icon_name: 'dialog-information-symbolic',
    })
    window.add(page)

    const group0 = new Adw.PreferencesGroup()
    page.add(group0)
    const input0 = new Adw.EntryRow({ title: 'External Controller' })
    group0.add(input0)
    const btn0 = new Adw.ButtonRow({ title: 'Reset' })
    btn0.connect('activated', () => {
      window._settings.set_string('external-controller', 'http://localhost:9090')
    })
    group0.add(btn0)

    const group1 = new Adw.PreferencesGroup()
    page.add(group1)
    const input1 = new Adw.EntryRow({ title: 'Dashboard URL' })
    group1.add(input1)
    const btn1 = new Adw.ButtonRow({ title: 'Reset' })
    btn1.connect('activated', () => {
      window._settings.set_string('dashboard-url', 'https://d.metacubex.one')
    })
    group1.add(btn1)

    window._settings = this.getSettings('org.gnome.shell.extensions.mihomotray')
    window._settings.bind('external-controller', input0, 'text', Gio.SettingsBindFlags.DEFAULT)
    window._settings.bind('dashboard-url', input1, 'text', Gio.SettingsBindFlags.DEFAULT)
  }
}