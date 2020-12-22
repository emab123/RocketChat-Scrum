const rocket = require("./mock_rocket");
const supData = require("./mock_supdata");
const {expect, assert} = require("chai");
const sinon = require("sinon");
const bot = require("../lib");

describe("Setup", () => {
    before(() => {
        sinon.stub(process, 'exit');
    });
    after(() => {
        process.exit.reset();
    });
    it("Loads the config", async () => {
        let stop = await bot();
        await stop();
        expect(supData.load.called).to.be.true;
        expect(supData.bot_id).to.be.eq("bot-id");
    });
    it("Connects to rocket chat server", async () => {
        let stop = await bot();
        await stop();
        expect(rocket.driver.connect.called).to.be.true;
        expect(rocket.driver.login.called).to.be.true;
    });
    it("Subscribes", async () => {
        let stop = await bot();
        await stop();
        expect(rocket.driver.subscribeToMessages.called).to.be.true;
        expect(rocket.driver.reactToMessages.called).to.be.true;
    });
    it("Terminates on any rocket.driver method error", async () => {
        process.exit.resetHistory();
        for(let method of ['connect','login', 'subscribeToMessages', 'reactToMessages']) {
            rocket.driver[method].throws();
            try {
                let stop = await bot();
                assert(stop == undefined);
            } catch {
                assert(false);
            }
            //reset
            rocket.driver[method].returns(undefined);
        }
        expect(process.exit.callCount).to.be.eq(4);
    });
    it("Handles interrupts", (done) => {
        process.kill(process.pid, "SIGINT");
        setTimeout(() => {
            expect(process.exit.called).to.be.true;
            done();
        });
    });
});