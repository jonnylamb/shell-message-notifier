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
const St = imports.gi.St;

let originalSetCount;
let label;

function MessageLabel() {
    this._init();
}

MessageLabel.prototype = {
    _init: function() {
        this.countLabel = new St.Label({style_class: 'message-label'});

        this.actor = new St.Button({name: 'messageButton',
                                    style_class: 'message-button'});
        this.actor.set_child(this.countLabel);

        this.updateCount();
    },

    updateCount: function() {
        let count = 0;

        let items = Main.messageTray._summaryItems;
        for (let i = 0; i < items.length; i++) {
            let s = items[i].source;
            if (s._counterBin.visible && s._counterLabel.get_text() != '0') {
                count++;
            }
        }

        this.countLabel.visible = count > 0;
        this.countLabel.set_text(count.toString());
    }
};

function customSetCount(count, visible) {
    let fallbackSetCount = Lang.bind(this, originalSetCount);
    fallbackSetCount(count, visible);

    label.updateCount();
}

function init() {
}

function enable() {
    originalSetCount = MessageTray.Source.prototype._setCount;
    MessageTray.Source.prototype._setCount = customSetCount;

    label = new MessageLabel();
    Main.panel._rightBox.insert_actor(label.actor, 0);
}

function disable() {
    MessageTray.Source.prototype._setCount = originalSetCount;
    originalSetCount = null;

    Main.panel._rightBox.remove_actor(label.actor);
    label = null;
}
