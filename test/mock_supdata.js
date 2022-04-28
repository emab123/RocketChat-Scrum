const log = require("loglevel").getLogger("MOCK");
const sinon = require("sinon");
delete require.cache[require.resolve('../lib/data')];
const supData = require("../lib/data");
const Group = require('../lib/group');

if(process.env.DEBUG) {
    log.setLevel(log.levels.DEBUG);
}

const mockedFns = ["findNextResponseForUser", "findGroups", "store", "load", "updatePendingStatus", "getUserSettings"];

for(let m of mockedFns) {
    sinon.stub(supData, m);
}

supData.reset = function() {
    for(let m of mockedFns) {
        supData[m].resetHistory();
    }
    this.responses = [];
    this.groups = [];
    this.pending = [];
}

module.exports = supData;