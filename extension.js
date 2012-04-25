/*
 * Copyright (C) 2011-2012 Marco Barisione <marco@barisione.org>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 */

const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

let originalSetCount = null;
let indicator = null;

function Indicator() {
    this._init.apply(this, arguments);
}

Indicator.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
        PanelMenu.Button.prototype._init.call(this, 0.0, "Message notifier");

        this._countLabel = new St.Label({style_class: 'message-label'});

        this.actor.visible = false;
        this.actor.add_actor(this._countLabel);

        this.updateCount();
    },

    _addItem: function(title, count, openFunction) {
        this._count += 1;

        if (count > 0)
            title += " (" + count.toString() + ")";

        let menuItem = new PopupMenu.PopupMenuItem(title);
        menuItem.connect('activate', openFunction);
        this.menu.addMenuItem(menuItem);
    },

    _addItemWithSource: function(title, count, source) {
        this._addItem(title, count, Lang.bind(source, source.open));
    },

    _handleGeneric: function(item, sourceCount) {
        // Easiest case: every notification item represents a single chat.
        this._addItemWithSource(item.source.title, sourceCount, item.source);
    },

    _handleGenericWithNotifications: function(item, sourceCount, showCount) {
        // A single notification icon represents more conversations. We try
        // to split them based on the title.
        // If showCount is true it means that the application generates a
        // notification per new message, so we can count them (like in the
        // XChat-GNOME case).
        // Otherwise, the application (Pidgin for instance) just generates
        // a notification for the first message, so we cannot rely on
        // counting the notifications.

        if (!item.source.notifications)
            return;

        let countMap = {}
        for (let i = 0; i < item.source.notifications.length; i++) {
            let title = item.source.notifications[i].title;
            let count = countMap[title];
            if (count == undefined)
                count = 0;
            countMap[title] = count + 1;
        }

        for (let title in countMap)
            this._addItemWithSource(title, showCount ? countMap[title] : -1, item.source);
    },

    _startHandlingNotifySend: function() {
        this._pendingNotifySend = {}
    },

    _handleNotifySend: function(item, sourceCount) {
        // notify-send is invoked once per new message, so we need to go
        // through all the notifications icons, group them and then add
        // the items.
        // Note that notify-send is rubbish with gnome-shell as it ends
        // up just piling up notification icons in the tray and clicking
        // on them cannot open the corresponding application. By grouping
        // the notifications with the same title together we try to improve
        // things as a single click can get rid of multiple notifications.

        if (!item.source.notifications)
            return;

        // I really don't think there can be multiple ones, but...
        for (let i = 0; i < item.source.notifications.length; i++) {
            let title = item.source.notifications[i].title;
            let existing = this._pendingNotifySend[title];
            if (existing == undefined)
                existing = new Array();
            existing.push(item.source);
            this._pendingNotifySend[title] = existing;
        }
    },

    _finishHandlingNotifySend: function() {
        for (let title in this._pendingNotifySend) {
            let notifications = this._pendingNotifySend[title];
            this._addItem(title, notifications.length, function() {
                // We call open on all of the notifications, but I don't think it
                // can do anything in the notify-send case (except for dismissing
                // the notification).
                for (let i = 0; i < notifications.length; i++)
                    notifications[i].open();
            });
        }

        this._pendingNotifySend = undefined;
    },

    _handleXChatGnome: function(item, sourceCount) {
        this._handleGenericWithNotifications(item, sourceCount, true);
    },

    _handlePidgin: function(item, sourceCount) {
        this._handleGenericWithNotifications(item, sourceCount, false);
    },

    updateCount: function() {
        let app_map = {
            'telepathy':            this._handleGeneric, /* Chat notifications */
            'notify-send':          this._handleNotifySend,
            'xchat-gnome.desktop':  this._handleXChatGnome,
            'pidgin.desktop':       this._handlePidgin,
        };

        this._count = 0;
        this._startHandlingNotifySend();
        this.menu.removeAll();

        let items = Main.messageTray._summaryItems;

        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let source = item.source;
            let sourceCount = parseInt(source._counterLabel.get_text(), 10);

            if (!isNaN(sourceCount) && sourceCount > 0) {
                let key = null;
                if (source.isChat)
                    key = 'telepathy';
                else if (source.app)
                    key = source.app.get_id();
                else if (item.source.title == 'notify-send')
                    key = 'notify-send'

                if (key != null || source.isChat) {
                    let app_cb = app_map[key];
                    if (app_cb != null)
                        app_cb.call(this, item, sourceCount);
                }
            }
        }

        this._finishHandlingNotifySend();

        this._countLabel.set_text(this._count.toString());
        this.actor.visible = this._count > 0;
    },
}

function customSetCount(count, visible) {
    originalSetCount.call(this, count, visible);
    indicator.updateCount();
}

function init() {
}

function enable() {
    originalSetCount = MessageTray.Source.prototype._setCount;
    MessageTray.Source.prototype._setCount = customSetCount;

    indicator = new Indicator();
    Main.panel.addToStatusArea('message-notifier', indicator, 0);
}

function disable() {
    MessageTray.Source.prototype._setCount = originalSetCount;
    originalSetCount = null;

    indicator.destroy();
    indicator = null;
}
