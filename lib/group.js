const rocket = require("rocketchat-js-sdk");
const logger = require("loglevel");

function getTime(variable, def) {
    if(!variable)
        return def;
    return variable.split(":").map(e => parseInt(e));
}

async function getMemberList(roomId, apiCall) {
    try {
        let res = await rocket.api.get(apiCall, { roomId });
        return res.members.filter(e => !e.username.toLowerCase().includes(process.env.ROCKETCHAT_USER));
    } catch (error) {
        logger.error(error);
        return [];
    }
}

const defaultReportDays = process.env.REPORT_DAYS ? process.env.REPORT_DAYS.split(",") : [1,2,3,4,5];


class Group {
    constructor(g) {
        this._nag = getTime(process.env.BOT_TIME_NAG, [9,0]);
        this._summary = getTime(process.env.BOT_TIME_SUMMARY, [10,0]);
        this.reportDays = defaultReportDays;
        this.last_summary = new Date(0);
        this.last_nag = new Date(0);
        this.responses = [];
        this.users = new Map();
        this._id = g._id;
        this.fname = g.fname;
        this.name = g.name;
    }

    get completeResponses() {
        return this.responses.filter(e => e.stage === 4);
    }

    get inclompleteResponses() {
        return this.responses.filter(e => e.stage !== 4);
    }

    get summary_time() {
        return Group._createDate(this._summary);
    }

    set summary_time(val) {
        if(!Array.isArray(val) || val.length !== 2) {
            throw new Error("Invalid time, use array [hour, min]!");
        }
        this._summary = val;
    }

    get nag_time() {
        return Group._createDate(this._nag);
    }

    set nag_time(val) {
        if(!Array.isArray(val) || val.length !== 2) {
            throw new Error("Invalid time, use array [hour, min]!");
        }
        this._nag = val;
    }

    //true if we haven't created a summary yet since being overdue
    isSummarizedReportTime(time) {
        return this.isReportTime(time) && this.last_summary < this.summary_time;
    }

    //true if we are time above the summary
    isReportTime(time) {
        return time > this.summary_time;
    }

    isNagTime(time) {
        return time > this.nag_time && this.last_nag < this.nag_time;
    }

    clearResponses(filter) {
        this.responses = this.responses.filter(filter);
    }

    async findUsers() {
        let tmp = await getMemberList(this._id, "groups.members");
        for (let u of tmp) {
            if (this.users.has(u.username)) {
                let t = this.users.get(u.username);
                //update status
                if(u.status !== t.status)
                    t.status = u.status;
                this.users.set(u.username, t);
            } else {
                this.users.set(u.username, u);
            }
        }
    }

    static _createDate(vals) {
        let d = new Date();
        d.setHours(vals[0]);
        d.setMinutes(vals[1]);
        d.setSeconds(0);
        d.setMilliseconds(0);
        return d;
    }

    toJSON() {
        return {
            nag: this.nag,
            last_nag: this.last_nag,
            summary: this.summary,
            last_summary: this.last_summary,
            responses: this.responses,
            reportDays: this.reportDays,
            fname: this.fname,
            name: this.name,
            _id: this._id
        };
    }

    static fromJSON(data) {
        if(!data._id || !data.name || !data.fname) {
            throw new Error("Invalid format for group!");
        }
        let g = new Group(data);
        g.nag = data.nag;
        g.last_nag = data.last_nag || new Date(0);
        g.summary = data.summary;
        g.last_summary = data.last_summary || new Date(0);
        g.responses = data.responses || [];
        g.reportDays = data.reportDays || defaultReportDays;
        return g;
    }
};

module.exports = Group;