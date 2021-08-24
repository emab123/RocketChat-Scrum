const log = require("loglevel");
const sinon = require("sinon");
const { expect, assert } = require("chai");
const rocket = require("./mock_rocket");
const supData = require("./mock_supdata");
const nag = require("../lib/nag");
const messages = require("../lib/messages");
const Group = require("../lib/group");


log.setDefaultLevel(0);


describe("Nagging", () => {
    afterEach(() => {
        rocket.driver.reset();
        supData.reset();
    });
    it("has a run function", () => {
        assert(!!nag.run);
    });
    describe("Handling users", () => {
        beforeEach(() => {
            let grp = new Group({_id: "test1", name: "test1", fname: "Test1"});
            grp.users.set("test.user", {username: "test.user", name: "Test User", status: "online" });
            grp.users.set("offline.user", {username: "offline.user", name: "Offline User", status: "offline" });
            supData.groups = [grp];
        });
        afterEach(() => {
            supData.groups = [];
        }) 
        it("nags only online users", async () => {
            supData.nag.last = new Date(0);
            supData.nag.time = [0,0];
            rocket.api.get.resetHistory();
            rocket.api.get.returns({members: []});
            await nag.run();
            grp = supData.groups[0];
            expect(supData.nag.last.getTime()).to.be.not.eq(new Date(0).getTime());
            expect(rocket.driver.getDirectMessageRoomId.calledWith("test.user"));
            expect(rocket.driver.messages).length(1);
            expect(supData.pending).length(1);
            expect(supData.pending[0]).property("username").to.be.eq("offline.user");
        });
        it("uses the correct message for nagging", async () => {
            const expected = messages.getMessage(messages.messageList.BEGIN, {name: "Test User"});
            supData.nag.time = [0,0];
            supData.nag.last = new Date(0);
            await nag.run();
            expect(rocket.driver.messages[0].msg).to.be.eq(expected);
        });
        it("captures errors when sending messages", async () => {
            let old = rocket.driver.sendMessage;
            rocket.api.get.resetHistory();
            rocket.api.get.returns({members: []});
            rocket.driver.sendMessage = sinon.stub().throws();
            sinon.stub(log, "error");
            supData.nag.time = [0,0];
            supData.nag.last = new Date(0);
            try {
                await nag.run();
                //undo stubbing
                expect(log.error.calledTwice);
                expect(log.error.firstCall.args[0]).to.be.eq("Error when sending DM to Test User");
                expect(rocket.api.get.calledOnce);
            } catch(e) {
                assert(false, "It has thrown" + e.toString());
            } finally {
                rocket.driver.sendMessage = old;
                log.error.restore();
            }
        });
    });
});