const {expect} = require("chai");
const fs = require("fs");
const rocket = require("./mock_rocket");
const sinon = require("sinon");

delete require.cache[require.resolve('../lib/data')];
const supData = require("../lib/data");
const Group = require("../lib/group");


describe.only("Stand-Up-Data", () => {
    it("Loads an data file and sets the values", async () => {
        let data = {
            groups: [{ _id : "test-id1", fname: "test", name: "Testing", nag: [1,1], summary: [2,2]}],
            reportDays: [0,1,2,3,4,5,6],
            pending: ["me"]
        };
        sinon.stub(fs.promises, "readFile").returns(JSON.stringify(data));
        const old = process.env.DATA_FILE;
        process.env.DATA_FILE="some-weird/path";
        await supData.load();
        expect(fs.promises.readFile.firstCall.firstArg).to.be.eq(process.env.DATA_FILE);
        expect(supData.groups).length(1);
        expect(supData.groups[0]).instanceOf(Group);
        expect(supData.pending).to.be.eql(["me"]);
        //restore
        process.env.DATA_FILE = old;
        fs.promises.readFile.restore();
    });
    it("Loads the default on empty data file", async () => {
        sinon.stub(fs.promises, "readFile").returns("{}");
        await supData.load();
        expect(fs.promises.readFile.called).to.be.true;
        expect(supData.groups).length(0);
        expect(supData.pending).to.be.eql([]);
        fs.promises.readFile.restore();
    });
    it("Handles non existent files", async () => {
        sinon.stub(fs.promises, "readFile").throws();
        try {
            await supData.load();
        } catch {
            assert(false);
        }
        fs.promises.readFile.restore();
    });
    it("Writes file on store", async () => {
        sinon.stub(fs.promises, "writeFile");
        await supData.store();
        expect(fs.promises.writeFile.called).to.be.true;
        expect(fs.promises.writeFile.firstCall.firstArg).to.be.eq(process.env.DATA_FILE);
        fs.promises.writeFile.restore();
    });
    it("Handles write errors on store", async () => {
        sinon.stub(fs.promises, "writeFile").throws();
        try {
            await supData.store();
            expect.fail("Method should have thrown");
        } catch {
        }
        fs.promises.writeFile.restore();
    })
    it("Sets users pending", () => {
        const usr = {_id: "testid", username: "test", groups: []};
        const grp = new Group({_id: "1", name: "test", fname: "Test"});
        grp.users.set("test", usr);
        supData.groups.push(grp);
        supData.setUsersOfGroupPending(grp);
        expect(supData.pending).to.be.deep.eq([usr]);
        supData.groups.shift();
    });
    it("Sets a user only once pending", () => {
        const usr = {_id: "testid", username: "test", groups: []};
        const grp1 = new Group({_id: "1", name: "test", fname: "Test"});
        grp1.users.set("test", usr);
        const grp2 = new Group({_id: "2", name: "test2", fname: "Test Again"});
        grp2.users.set("test", usr);
        supData.groups.push(grp1, grp2);
        supData.setUsersOfGroupPending(grp1);
        supData.setUsersOfGroupPending(grp2);
        expect(supData.pending).to.be.deep.eq([usr]);
        supData.groups = [];
    })
    it("Asks the API to find groups", async () => {
        const groups = [{_id: "test1-id", fname: "test", name: "test1"}];
        const members = [{
            username: "test",
            status: "offline"
        }];
        rocket.api.get.reset();
        rocket.api.get.returns().onFirstCall().returns({groups});
        rocket.api.get.onSecondCall().returns({members});
        await supData.findGroups();
        expect(rocket.api.get.firstCall.firstArg).to.be.eq("groups.list");
        expect(supData.groups).to.be.not.null;
        expect(supData.groups[0]).has.property("_id").to.eq("test1-id");
        expect(supData.groups[0].users.size).to.eq(1);
        expect(supData.groups[0].users.get("test")).to.be.deep.eq(members[0]);
        rocket.api.get.returns();
        rocket.api.get.resetHistory();
    });
});