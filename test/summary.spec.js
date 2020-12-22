const log = require("loglevel");
const { expect, assert } = require("chai");
const sinon = require("sinon");
const rocket = require("./mock_rocket");
const supData = require("./mock_supdata");
const summary = require("../lib/summary");
const messages = require("../lib/messages");

log.setDefaultLevel(5);


//Mocking find groups

function genFakeMessage() {
    let g = supData.groups.find(e => e._id == "test-id1");
    g.responses.push({
        "user": "test" + supData.responses.length,
        "stage": 1 + arguments.length,
        "messages": arguments
    });
}

describe("Summary", () => {
    beforeEach(() => {
        supData.addGroup("test-id1", "Test1", "test1");
        supData.addGroup("test-id2", "Test2", "test2");
    });
    afterEach(() => {
        rocket.driver.reset();
        supData.reset();
    });
    it("has a setup and stop", () => {
        assert(!!summary.setup);
        assert(!!summary.stop);
    });
    it("registers an interval on setup", async () => {
        let i = await summary.setup();
        assert(!!i);
        //cleanup
        summary.stop();
    });
    it("does not register an interval on setup(false)", async () => {
        let i = await summary.setup(false);
        expect(i).to.be.null;
    });
    it("updates the groups when iterating", async () => {
        supData.publish = [0,0];
        supData.last_summary = new Date(0);
        await summary.setup(false);
        expect(supData.findGroups.called).to.be.true;
    });
    it("sends a summary of multiple messages if it hasn't been published yet", async () => {
        const expectedMessage = new rocket.driver.prepareMessage({
            msg: messages.getMessage(messages.messageList.SUMMARY),
            bot: { i: 'js.SDK' },
            attachments: [
                {
                    title: messages.getMessage(messages.stageToMessage(0), { group: { fname: "Test1" } }),
                    fields: [
                        {
                            short: false,
                            value: '> **test0**: works\n> **test1**: even'
                        }
                    ]
                },
                {
                    title: messages.getMessage(messages.stageToMessage(1)),
                    fields: [
                        {
                            short: false,
                            value: '> **test0**: awesome\n> **test1**: Better'
                        }
                    ]
                },
                {
                    title: messages.getMessage(messages.stageToMessage(2)),
                    fields: [
                        {
                            short: false,
                            value: '> **test0**: totally\n> **test1**: than before'
                        }
                    ]
                }
            ]
        }, "test-id1");
        supData.publish = [0, 0]
        supData.last_summary = new Date(0);
        genFakeMessage("works", "awesome", "totally")
        genFakeMessage("even", "Better", "than before");
        await summary.setup(false);
        expect(rocket.driver.messages[0]).to.be.deep.eq(expectedMessage);
    });
    it("sends a immediate summary of multiple messages indivually, if publish was due", async () => {
        const expectedMessage = rocket.driver.prepareMessage({
            msg: messages.getMessage(messages.messageList.LATE_SUMMARY, {user: "test0"}),
            bot: { i: 'js.SDK' },
            attachments: [
                {
                    title: messages.getMessage(messages.stageToMessage(0), { group: { fname: "Test1" } }),
                    fields: [
                        {
                            short: false,
                            value: '> works'
                        }
                    ]
                },
                {
                    title: messages.getMessage(messages.stageToMessage(1)),
                    fields: [
                        {
                            short: false,
                            value: '> immediately'
                        }
                    ]
                },
                {
                    title: messages.getMessage(messages.stageToMessage(2)),
                    fields: [
                        {
                            short: false,
                            value: '> not'
                        }
                    ]
                }
            ]

        }, "test-id1");
        supData.publish = [0, 0];
        supData.last_summary = new Date();
        genFakeMessage("works", "immediately", "not");
        await summary.setup(false);
        expect(rocket.driver.messages).length(1);
        expect(rocket.driver.messages[0]).to.be.deep.eq(expectedMessage);
    });
    it("sends messages to multiple groups", async () => {
        supData.publish = [0, 0];
        supData.last_summary = new Date();
        genFakeMessage("works", "immediately", "not");
        genFakeMessage("works", "immediately", "not");
        supData.responses[0].group = supData.groups[1];
        await summary.setup(false);
        expect(rocket.driver.messages).lengthOf(2);
        expect(rocket.driver.messages[0]).has.property("rid", "test-id2");
    });
    it("captures exceptions", async () => {
        let old = rocket.driver.sendMessage;
        rocket.driver.sendMessage = sinon.stub().throws();
        sinon.stub(log, "error");
        supData.publish = [0, 0];
        supData.last_summary = new Date();
        genFakeMessage("works", "immediately", "not");
        genFakeMessage("works", "immediately", "not");
        try {
            await summary.setup(false);
        } catch {
            expect.fail("Should not have thrown");
        }
        expect(log.error.calledTwice);
        expect(log.error.firstCall.args).to.be.eql(["Summary has thrown the following error"]);
        log.error.restore();
        rocket.driver.sendMessage = old;
    });
});