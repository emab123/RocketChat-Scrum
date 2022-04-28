const log = require("loglevel").getLogger("MOCK");
const sinon = require("sinon");
delete require.cache[require.resolve('../lib/data')];
const supData = require("../lib/data");
const Group = require('../lib/group');

if(process.env.DEBUG) {
    log.setLevel(log.levels.DEBUG);
}

sinon.stub(supData, "findNextResponseForUser");
sinon.stub(supData, "findGroups");
sinon.stub(supData, "store");
sinon.stub(supData, "load");
sinon.stub(supData, "updatePendingStatus");

supData.reset = function() {
    for(let m of ["findNextResponseForUser", "findGroups", "store", "load", "updatePendingStatus"]) {
        supData[m].resetHistory();
    }
    this.responses = [];
    this.groups = [];
    this.pending = [];
}

module.exports = supData;