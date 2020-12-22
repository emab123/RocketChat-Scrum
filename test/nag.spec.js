const log = require("loglevel");
const sinon = require("sinon");
const { expect, assert } = require("chai");
const rocket = require("./mock_rocket");
const supData = require("./mock_supdata");
const nag = require("../lib/nag");
const messages = require("../lib/messages");


log.setDefaultLevel(5);


describe("Nagging", () => {
    afterEach(() => {
        rocket.driver.reset();
        supData.reset();
    });
    it("has a setup and stop", () => {
        assert(!!nag.setup);
        assert(!!nag.stop);
    });
    it("registers an interval on setup", async () => {
        let i = await nag.setup();
        assert(!!i);
        nag.stop();
    });
    it("does not register an interval on setup(false)", async () => {
        let i = await nag.setup(false);
        assert(!i);
    });
    it("searches for users", async () => {
        await nag.setup(false);
        expect(supData.findUsers.called).to.be.true;
        nag.stop();
    });
    describe("Handling users", () => {
        beforeEach(() => {
            supData.addUser("test.user", "Test User", {groups: ["test1"], status: "online" });
            supData.addUser("offline.user", "Offline User", {groups: ["test1", "test2"], status: "offline" });
        });
        it("nags only online users", async () => {
            supData.dialog = [0,0];
            supData.last_nag = new Date(0);
            await nag.setup(false);
            expect(supData.last_nag.toString()).to.be.eq(supData.nag_time.toString());
            expect(supData.pending).length(1);
            expect(rocket.driver.getDirectMessageRoomId.calledWith("test.user"));
            expect(rocket.driver.messages).length(1);
            expect(supData.pending[0]).property("username").to.be.eq("offline.user");
        });
        it("uses the correct message for nagging", async () => {
            const expected = messages.getMessage(messages.messageList.BEGIN, {user: { name: "Test User"}});
            supData.dialog = [0,0];
            supData.last_nag = new Date(0);
            await nag.setup(false);
            expect(rocket.driver.messages[0].msg).to.be.eq(expected);
        });
        it("captures errors when sending messages", async () => {
            let old = rocket.driver.sendMessage;
            rocket.driver.sendMessage = sinon.stub().throws();
            sinon.stub(log, "error");
            supData.dialog = [0,0];
            supData.last_nag = new Date(0);
            try {
                await nag.setup(false);
                //undo stubbing
                expect(log.error.calledTwice);
                expect(log.error.firstCall.args).to.be.eql(["Error when sending DM to Test User"]);

            } catch(e) {
                assert(false, "It has thrown" + e);
            } finally {
                rocket.driver.sendMessage = old;
                log.error.restore();
            }
        });
    });
})