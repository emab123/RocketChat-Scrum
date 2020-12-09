const fs = require('fs');
const rocket = require("rocketchat-js-sdk");

function createTime(vals) {
    let d = new Date();
    d.setHours(vals[0]);
    d.setMinutes(vals[1]);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

async function getMemberList(roomId, apiCall) {
    try {
        let res = await rocket.api.get(apiCall, { roomId });
        return res.members.filter(e => !e.username.toLowerCase().includes(process.env.ROCKETCHAT_USER));
    } catch (error) {
        console.log(error);
        return [];
    }
}

function getTime(variable, def) {
    if(!variable)
        return def;
    return variable.split(":").map(e => parseInt(e));
}

class StandupData {
    constructor() {
        this.last_nag = new Date(0);
        this.last_summary = new Date(0);
        this.responses = [];
        this.pending = [];
        this.users = new Map();
        this.groups = [];
        this.bod_id = "";
        this.dialog = getTime(process.env.BOT_TIME_DIALOG, [9,0]);
        this.publish = getTime(process.env.BOT_TIME_PUBLISH, [10,0]);
    }
    get nag_time() {
        return createTime(this.dialog);
    }

    get summary_time() {
        return createTime(this.publish)
    }

    setAllUsersPending() {
        this.pending = Array.from(this.users.values());
    }

    async store() {
        await fs.promises.writeFile(process.env.DATA_FILE, JSON.stringify({
            last_nag: this.last_nag,
            last_summary: this.last_summary,
            pending: this.pending,
            responses: this.responses
        }));
    }
    
    async load() {
        try {
            let content = JSON.parse(await fs.promises.readFile(process.env.DATA_FILE));
            this.last_nag = content.last_nag ? new Date(content.last_nag) : new Date(0);
            this.last_summary = content.last_summary ? new Date(content.last_summary) : new Date(0);
            this.pending = content.pending;
            this.responses = content.responses;
            console.log("Data parsed from data file");
        } catch(e) {
            console.log("No time file found -> skipping", e);
        }
    }

    async findUsers() {
        let res = await rocket.api.get('groups.list');
        this.groups = res.groups;
        //find users in channels/groups
        for (let g of this.groups) {
            //pluck
            g = {_id: g._id, name: g.name, fname: g.fname};
            let tmp = await getMemberList(g._id, "groups.members");
            for (let u of tmp) {
                if (this.users.has(u.username)) {
                    let t = this.users.get(u.username);
                    //update status
                    if(u.status !== t.status)
                        t.status = u.status;
                    //add group only once
                    if(!t.groups.find(gr => gr._id === g._id))
                        t.groups.push(g);
                    this.users.set(u.username, t);
                } else {
                    this.users.set(u.username, { groups: [g], ...u });
                }
            }
        }
    }
}

module.exports = new StandupData();