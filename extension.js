/*
 * Copyright (C) 2011 Marco Barisione <marco@barisione.org>
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

    updateCount: function() {
        let count = 0;

        let items = Main.messageTray._summaryItems;
        for (let i = 0; i < items.length; i++) {
            let messageCount = parseInt(items[i].source._counterLabel.get_text(), 10);
            if (!isNaN(messageCount) && messageCount > 0) {
                count++;
            }
        }

        this._countLabel.set_text(count.toString());
        this.actor.visible = count > 0;
    }
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
