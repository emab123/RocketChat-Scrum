const rocket = require("./mock_rocket");
const {expect} = require("chai");
const sinon = require("sinon");
const log = require("loglevel");
const Group = require("../lib/group");

describe("Groups", () => {
    after(() => {
        rocket.driver.reset();
    })
    it("Loads a group and applies defaults", () => {
        process.env.BOT_TIME_SUMMARY = "11:12";
        let g = new Group({fname: "test", name: "test1", _id: "id"});
        expect(g._id).to.be.eq("id");
        expect(g.name).to.be.eq("test1");
        expect(g.fname).to.be.eq("test");
        expect(g.users).to.be.instanceOf(Map);
        expect(g.responses).to.be.deep.eq([]);
        expect(g.reportDays).to.be.deep.eq([1,2,3,4,5]);
        expect(g.summary_time.getHours()).to.be.eq(11);
        expect(g.summary_time.getMinutes()).to.be.eq(12);
        //cleanup
        process.env.BOT_TIME_SUMMARY = undefined;
    });
    it("Loads a json and converts all types", () => {
        let data = {
            summary: [1,2],
            reportDays: [3,4],
            last_summary: (new Date(0)).toString(),
            responses: [{ username: "Test", messages: ["1","2"]}],
            users: ["i'm", "ignored"],
            _id: "id",
            fname: "FNAME",
            name: "NAME"
        }
        let g = Group.fromJSON(JSON.parse(JSON.stringify(data)));
        expect(g._id).to.be.eq("id");
        expect(g.fname).to.be.eq("FNAME");
        expect(g.name).to.be.eq("NAME");
        expect(g.summary).to.be.deep.eq([1,2]);
        expect(g.responses).to.have.length(1).and.deep.includes(data.responses[0]);
        expect(g.users).to.be.instanceOf(Map);
        expect(g.last_summary).to.be.instanceOf(Date);
        expect(g.last_summary).to.be.deep.eq(new Date(0));
        expect(g.reportDays).to.have.length(2).and.be.deep.eq([3,4]);
    });

    it("Searches for users", async () => {
        let user = {username: "user", user: "test.user", _id: "userid"};
        rocket.api.get.reset();
        rocket.api.get.returns({members: [user]});
        let g = new Group({fname: "test", name: "test1", _id: "id"});
        await g.findUsers();
        expect(g.users.size).to.be.eq(1);
        expect(g.users.has("user")).to.be.true;
        expect(g.users.get("user")).to.be.deep.equal(user);
        //reset
        rocket.api.get.returns();
    });

    it("Handles errors on user searching", async () => {
        let old = rocket.api.get;
        rocket.api.get = sinon.stub().throws();
        sinon.stub(log, "error");
        let g = new Group({fname: "test", name: "test1", _id: "id"});
        try {
            await g.findUsers();
        } catch {
            expect.fail("Should not have been called");
        }
        log.error.restore();
        rocket.api.get = old;
    });
});