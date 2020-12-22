const fs = require('fs');
const rocket = require("rocketchat-js-sdk");
const log = require("loglevel");
const Group = require('./group');

class StandupData {
    constructor() {
        this.groups = [];
        //Sunday: 0, Saturday: 6
        this.users = new Map();
        this.pending = [];
        this.bot_id = "";
    }

    shouldReport(date) {
        return this.reportDays.includes(date.getDay());
    }

    async store() {
        //for debugging purposes
        await fs.promises.writeFile(process.env.DATA_FILE, JSON.stringify({
            groups: this.groups,
            pending: this.pending,
            reportDays: this.reportDays
        }));
    }

    async load() {
        try {
            let content = JSON.parse(await fs.promises.readFile(process.env.DATA_FILE));
            this.pending = Array.isArray(content.pending) ? content.pending : [] ;
            this.groups = Array.isArray(content.groups) ? content.groups.map(e => Group.fromJSON(e)) : [];
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
            if(!this.pending.find(usr => u._id === usr._id)) {
                //add
                this.pending.push(u);
            }
        }
    }

    findNextResponseForUser(user) {
        for(let g of groups) {
            let r = g.responses.find(r => r.user === user.user && r.stage !== 4)
            if(r) {
                return r;
            }
        }
        return null;
    }
}

module.exports = new StandupData();