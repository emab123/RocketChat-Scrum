const fs = require('fs');
const rocket = require("rocketchat-js-sdk");
const log = require("loglevel");
const Group = require('./group');
const {createDate, getTime} = require("./util");
const Mutex = require('async-mutex').Mutex;


const defaultNagTime = getTime(process.env.BOT_TIME_NAG, [12,10]);
class StandupData {
    constructor() {
        this.groups = [];
        this.userSettings = [];
        this.pending = [];
        this.mutex = new Mutex();
        this.nag = {
            time: defaultNagTime,
            last: new Date(0),
            days: [2,4,6]
        }
        this.bot_id = "";
        this._last = "";
    }

    get nag_time() {
        return createDate(this.nag.time);
    }

    isNagTime(time) {
        log.debug(`Is time? ${time > this.nag_time}`, time, this.nag_time);
        log.debug(`Is nag day? ${this.nag.days.includes(time.getDay())}`);
        return this.nag.days.includes(time.getDay()) && time > this.nag_time && this.nag.last < this.nag_time;
    }

    async store() {
        await this.mutex.runExclusive(async () => {
            let content = JSON.stringify({
                groups: this.groups,
                pending: this.pending,
                userSettings: this.userSettings,
                nag: this.nag
            }, null, 2);
            if(content === this._last) {
                return;
            }
            log.debug("Storing changed settings / data");
            this._last = content;
            //for debugging purposes
            await fs.promises.writeFile(process.env.DATA_FILE, content);
        });
    }

    async load() {
        await this.mutex.runExclusive(async () => {
            try {
                let content = this._last = JSON.parse(await fs.promises.readFile(process.env.DATA_FILE));
                this.pending = Array.isArray(content.pending) ? content.pending : [] ;
                this.groups = Array.isArray(content.groups) ? content.groups.map(e => Group.fromJSON(e)) : [];
                this.nag = content.nag || {
                    last: new Date(0),
                    time: defaultNagTime,
                    days: [2,4,6]
                };
                this.userSettings = Array.isArray(content.userSettings) ? content.userSettings : [];
                if(!(this.nag.last instanceof Date))
                    this.nag.last = new Date(this.nag.last);
                log.debug("Data parsed from data file");
            } catch(e) {
                log.warn("No time file found -> skipping", e);
            }
        });
    }

    async findGroups() {
        try {
            let res = await rocket.api.get('groups.list');
            for(let g of res.groups) {
                let cur = this.groups.find(e => e._id == g._id);
                if(!cur) {
                    //need to create it
                    cur = new Group(g);
                    this.groups.push(cur);
                    await cur.findUsers();
                } else {
                    //update some attributes
                    cur.fname = g.fname;
                    cur.name = g.name;
                }
            }
        } catch(e) {
            log.warn("Failed to update groups -> keeping old ones");
            log.debug(e);
        }
    }

    setUsersOfGroupPending(group) {
        for(let u of group.users.values()) {
            if(!this.pending.find(usr => u.username === usr.username)) {
                //add
                this.pending.push(u);
            }
        }
    }

    async updatePendingStatus() {
        let updates = this.pending.map(async (u) => {
            try {
                let res = await rocket.api.get('users.getStatus', { userId: u._id });
                u.status = res.status;
            } catch(e) {
                log.warn(`Unable to update status -> ${e.errno}: ${e.code}`);
                log.debug(e);
            }
        });
        return Promise.all(updates);
    }

    findNextResponseForUser(user) {
        for(let g of this.groups) {
            let r = g.responses.find(r => r.user.username === user.username && r.stage !== 4)
            if(r) {
                return {response: r, group: g};
            }
        }
        return {response: null, group: null};
    }

    getUserSettings(user) {
        return this.userSettings.find(e => e.username === user.username);
    }

    setUserSettings(user, settings) {
        let s = this.getUserSettings(user);
        if(!s) {
            this.userSettings.push({username: user.username, ...settings});
        } else {
            s = Object.assign(s, settings);
        }
    }
}

module.exports = new StandupData();
