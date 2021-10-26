const log = require("loglevel");
const { expect } = require("chai");
const fs = require("fs");
const rocket = require("./mock_rocket");
const sinon = require("sinon");

const utils = require('util');

delete require.cache[require.resolve('../lib/data')];
const supData = require("../lib/data");
const Group = require("../lib/group");


describe("Stand-Up-Data", () => {
    it("loads an data file and sets the values", async () => {
        process.env.BOT_TIME_NAG = "0:1";
        let data = {
            groups: [{ _id: "test-id1", fname: "test", name: "Testing", summary: [2, 2], reportDays: [0, 1, 2, 3, 4, 5, 6] }],
            nag: {
                last: new Date(23),
                time: [1, 2],
                days: [2, 3, 5]
            },
            pending: ["me"],
            userSettings: [{username: "test", instructions_sent: true}]
        };
        sinon.stub(fs.promises, "readFile").returns(JSON.stringify(data));
        const old = process.env.DATA_FILE;
        process.env.DATA_FILE = "some-weird/path";
        await supData.load();
        expect(fs.promises.readFile.firstCall.firstArg).to.be.eq(process.env.DATA_FILE);
        expect(supData.nag_time.getHours()).to.be.eq(1);
        expect(supData.nag_time.getMinutes()).to.be.eq(2);
        expect(supData.nag.last.getTime()).to.be.eq(new Date(23).getTime());
        expect(supData.nag.days).to.be.deep.eq([2,3,5]);
        expect(supData.groups).length(1);
        expect(supData.groups[0]).instanceOf(Group);
        expect(supData.pending).to.be.eql(["me"]);
        expect(supData.userSettings).length(1);
        expect(supData.userSettings[0].username).to.be.eq("test");
        //restore
        process.env.DATA_FILE = old;
        fs.promises.readFile.restore();
    });
    it("loads the default on empty data file", async () => {
        sinon.stub(fs.promises, "readFile").returns("{}");
        await supData.load();
        expect(fs.promises.readFile.called).to.be.true;
        expect(supData.groups).length(0);
        expect(supData.pending).to.be.eql([]);
        fs.promises.readFile.restore();
    });
    it("handles non existent files", async () => {
        sinon.stub(fs.promises, "readFile").throws();
        try {
            await supData.load();
        } catch {
            assert(false);
        }
        fs.promises.readFile.restore();
    });
    it("writes file on store", async () => {
        sinon.stub(fs.promises, "writeFile");
        await supData.store();
        expect(fs.promises.writeFile.called).to.be.true;
        expect(fs.promises.writeFile.firstCall.firstArg).to.be.eq(process.env.DATA_FILE);
        fs.promises.writeFile.restore();
    });
    it("handles write errors on store", async () => {
        sinon.stub(fs.promises, "writeFile").throws();
        try {
            await supData.store();
            expect.fail("Method should have thrown");
        } catch {
        }
        fs.promises.writeFile.restore();
    })
    it("sets users pending", () => {
        const usr = { _id: "testid", username: "test"};
        const grp = new Group({ _id: "1", name: "test", fname: "Test" });
        grp.users.set("test", usr);
        supData.groups.push(grp);
        supData.setUsersOfGroupPending(grp);
        expect(supData.pending).to.be.deep.eq([usr]);
        supData.groups = [];
        supData.pending = [];
    });
    it("sets a user only once pending", () => {
        const usr = { user: "testid", username: "test"};
        const grp1 = new Group({ _id: "1", name: "test", fname: "Test" });
        grp1.users.set("testid", usr);
        const grp2 = new Group({ _id: "2", name: "test2", fname: "Test Again" });
        grp2.users.set("testid", usr);
        supData.groups.push(grp1, grp2);
        supData.setUsersOfGroupPending(grp1);
        supData.setUsersOfGroupPending(grp2);
        expect(supData.pending).to.be.eql([usr]);
        supData.groups = [];
        supData.pending = [];
    })
    it("asks the API to find groups", async () => {
        const groups = [{ _id: "test1-id", fname: "test", name: "test1" }];
        const members = [{
            username: "test",
            status: "offline"
        }];
        rocket.api.get.reset();
        rocket.api.get.returns().onFirstCall().returns({ groups });
        rocket.api.get.onSecondCall().returns({ members });
        await supData.findGroups();
        expect(rocket.api.get.firstCall.firstArg).to.be.eq("groups.list");
        expect(supData.groups).to.be.not.null;
        expect(supData.groups[0]).has.property("_id").to.eq("test1-id");
        expect(supData.groups[0].users.size).to.eq(1);
        expect(supData.groups[0].users.get("test")).to.be.deep.eq(members[0]);
        rocket.api.get.returns();
        rocket.api.get.resetHistory();
    });
    it("handles errors when API fails to respond", async () => {
        rocket.api.get.reset();
        rocket.api.get.throws({code: "test", errno: 1});
        sinon.spy(log, "warn");
        try {
            await supData.findGroups();
        } catch(e) {
            expect.fail("Has thrown");
        }
        expect(log.warn.called).to.be.true;
        rocket.api.get.returns();
        log.warn.restore();
    })
});