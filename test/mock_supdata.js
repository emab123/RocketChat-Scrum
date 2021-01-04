const log = require("loglevel").getLogger("MOCK");
const sinon = require("sinon");
delete require.cache[require.resolve('../lib/data')];
const supData = require("../lib/data");
const Group = require('../lib/group');

if(process.env.DEBUG) {
    log.setLevel(log.levels.DEBUG);
}

sinon.stub(supData, "findGroups");
sinon.stub(supData, "store");
sinon.stub(supData, "load");

supData.reset = function() {
    this.responses = [];
    this.groups = [];
    this.pending = [];
}

module.exports = supData;