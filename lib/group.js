const rocket = require("rocketchat-js-sdk");
const logger = require("loglevel");
const StandupData = require("./data");
const {getTime, createDate} = require("./util");


async function callApi(roomId, apiCall) {
    try {
        let res = await rocket.api.get(apiCall, { roomId });
        return res.members.filter(e => !e.username.toLowerCase().includes(process.env.ROCKETCHAT_USER));
    } catch (e) {
        logger.error(`Unable to call ${apiCall} in ${roomId}: ${e.code}`);
        logger.debug(e);
        return [];
    }
}

const defaultReportDays = process.env.REPORT_DAYS ? process.env.REPORT_DAYS.split(",") : [2,4,6];


class Group {
    constructor(g) {
        this.summary = g.summary || getTime(process.env.BOT_TIME_SUMMARY, [13,10]);
        this.reportDays = g.reportDays || defaultReportDays;
        this.last_summary = g.last_summary || new Date(0);
        this.responses = g.responses || [];
        this.users = new Map();
        this._id = g._id;
        this.fname = g.fname;
        this.name = g.name;
    }

    get completeResponses() {
        return this.responses.filter(e => e.stage === 4);
    }

    get incompleteResponses() {
        return this.responses.filter(e => e.stage !== 4);
    }

    get summary_time() {
        return createDate(this.summary);
    }

    set summary_time(val) {
        if(!Array.isArray(val) || val.length !== 2) {
            throw new Error("Invalid time, use array [hour, min]!");
        }
        this.summary = val;
    }

    shouldReport(date) {
        return this.reportDays.includes(date.getDay());
    }

    //true if we haven't created a summary yet since being overdue
    isSummarizedReportTime(time) {
        return this.isReportTime(time) && this.last_summary < this.summary_time;
    }

    //true if we are time above the summary
    isReportTime(time) {
        return this.shouldReport(time) && time > this.summary_time;
    }

    clearResponses(filter) {
        this.responses = this.responses.filter(filter);
    }

    async findUsers() {
        let tmp = await callApi(this._id, "groups.members");
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

    toJSON() {
        return {
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
        g.summary = data.summary;
        g.last_summary = data.last_summary || new Date(0);
        if(!(g.last_summary instanceof Date)) {
            g.last_summary = new Date(g.last_summary);
        }
        g.responses = data.responses || [];
        g.reportDays = data.reportDays || defaultReportDays;
        return g;
    }
};

module.exports = Group;
