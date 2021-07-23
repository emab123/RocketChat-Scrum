const fs = require('fs');
const rocket = require("rocketchat-js-sdk");
const log = require("loglevel");
const Group = require('./group');
const {createDate, getTime} = require("./util");


const defaultNagTime = getTime(process.env.BOT_TIME_NAG, [9,0]);
class StandupData {
    constructor() {
        this.groups = [];
        this.userSettings = [];
        this.pending = [];
        this.nag = {
            time: defaultNagTime,
            last: new Date(0),
            days: [1,2,3,4,5]
        }
        this.bot_id = "";
    }

    get nag_time() {
        return createDate(this.nag.time);
    }

    isNagTime(time) {
        log.debug(time, ' > ', this.nag_time);
        return this.nag.days.includes(time.getDay()) && time > this.nag_time && this.nag.last < this.nag_time;
    }

    async store() {
        //for debugging purposes
        await fs.promises.writeFile(process.env.DATA_FILE, JSON.stringify({
            groups: this.groups,
            pending: this.pending,
            userSettings: this.userSettings,
            nag: this.nag
        }, null, 2));
    }

    async load() {
        try {
            let content = JSON.parse(await fs.promises.readFile(process.env.DATA_FILE));
            this.pending = Array.isArray(content.pending) ? content.pending : [] ;
            this.groups = Array.isArray(content.groups) ? content.groups.map(e => Group.fromJSON(e)) : [];
            this.nag = content.nag || {
                last: new Date(0),
                time: defaultNagTime,
                days: [1,2,3,4,5]
            };
            this.userSettings = Array.isArray(content.userSettings) ? content.userSettings : [];
            if(!(this.nag.last instanceof Date))
                this.nag.last = new Date(this.nag.last);
            log.debug("Data parsed from data file");
        } catch(e) {
            log.warn("No time file found -> skipping", e);
        }
    }

    async findGroups() {
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
    }

    setUsersOfGroupPending(group) {
        for(let u of group.users.values()) {
            if(!this.pending.find(usr => u.username === usr.username)) {
                //add
                this.pending.push(u);
            }
        }
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