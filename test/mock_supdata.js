const log = require("loglevel").getLogger("MOCK");
const sinon = require("sinon");
delete require.cache[require.resolve('../lib/data')];
const supData = require("../lib/data");

if(process.env.DEBUG) {
    log.setLevel(log.levels.DEBUG);
}

supData.addGroup = function(_id, fname, name) {
    this.groups.push({_id, fname, name});
};

supData.addUser = function(username, name, data) {
    this.users.set(username, {username, name, ...data})
};

sinon.stub(supData, "findGroups");
sinon.stub(supData, "store");
sinon.stub(supData, "load");

supData.findGroups = sinon.spy();

supData.findUsers = sinon.spy();

supData.reset = function() {
    this.responses = [];
    this.groups = [];
    this.pending = [];
}

module.exports = supData;