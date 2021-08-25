const log = require("loglevel");
const { expect, assert } = require("chai");
const sinon = require("sinon");
const rocket = require("./mock_rocket");
const supData = require("./mock_supdata");
const summary = require("../lib/summary");
const messages = require("../lib/messages");
const Group = require('../lib/group');

log.setDefaultLevel(5);


//Mocking find groups

function genFakeMessage() {
    let g = supData.groups.find(e => e._id == "test-id1");
    g.responses.push({
        "user": { _id: "testid" + g.responses.length, username: "test" + g.responses.length, name: "Test" + g.responses.length + ", Name", status: "online" },
        "stage": 1 + arguments.length,
        "messages": arguments
    });
}

describe("Summary", () => {
    beforeEach(() => {
        supData.groups.push(new Group({_id: "test-id1", fname: "Test 1", name: "test1", _summary: [0,0], reportDays: [0,1,2,3,4,5,6]}));
        supData.groups.push(new Group({_id: "test-id2", fname: "Test 2", name: "test2", _summary: [0,0], reportDays: [0,1,2,3,4,5,6]}));
    });
    afterEach(() => {
        rocket.driver.reset();
        supData.reset();
    });
    it("has a run function", () => {
        assert(!!summary.run);
    });
    it("updates the groups when iterating", async () => {
        await summary.run();
        expect(supData.findGroups.called).to.be.true;
    });
    it("sends a summary of multiple messages if it hasn't been published yet", async () => {
        const expectedMessage = new rocket.driver.prepareMessage({
            msg: messages.getMessage(messages.messageList.SUMMARY),
            bot: { i: 'js.SDK' },
            attachments: [
                {
                    title: messages.getMessage(messages.stageToMessage(0), { group: { fname: "Test 1" } }),
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
        genFakeMessage("works", "awesome", "totally")
        genFakeMessage("even", "Better", "than before");
        await summary.run();
        expect(rocket.driver.messages[0]).to.be.deep.eq(expectedMessage);
    });
    it("sends a immediate summary of multiple messages indivually, if publish was due", async () => {
        const expectedMessage = rocket.driver.prepareMessage({
            msg: messages.getMessage(messages.messageList.LATE_SUMMARY, { user: {
                "_id": "testid",
                "username": "test0",
                "status": "online",
                "name": "Test, User"
              }}),
            bot: { i: 'js.SDK' },
            attachments: [
                {
                    title: messages.getMessage(messages.stageToMessage(0), { group: { fname: "Test 1" } }),
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
        genFakeMessage("works", "immediately", "not");
        supData.groups[0].last_summary = new Date();
        supData.groups[1].last_summary = new Date();
        await summary.run();
        expect(rocket.driver.messages).length(1);
        expect(rocket.driver.messages[0]).to.be.deep.eq(expectedMessage);
    });
    it("sends messages to multiple groups", async () => {
        supData.groups[0].responses.push({
            user: "test0",
            stage: 4,
            messages: ["works", "immediately", "not"]
        });
        supData.groups[1].responses.push({
            user: "test0",
            stage: 4,
            messages: ["works", "immediately", "not"]
        });
        await summary.run();
        expect(rocket.driver.messages).lengthOf(2);
        expect(rocket.driver.messages[0]).has.property("rid", "test-id1");
        expect(rocket.driver.messages[1]).has.property("rid", "test-id2");
    });
    it("handles exceptions", async () => {
        let old = rocket.driver.sendMessage;
        rocket.driver.sendMessage = sinon.stub().throws();
        sinon.stub(log, "error");
        genFakeMessage("works", "immediately", "not");
        genFakeMessage("works", "immediately", "not");
        try {
            await summary.run();
            expect.fail("Should have thrown");
        } catch {
        }
        log.error.restore();
        rocket.driver.sendMessage = old;
    });
});