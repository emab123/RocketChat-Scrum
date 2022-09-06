const log = require("loglevel");
const sinon = require("sinon");
const chai = require("chai");
const rocket = require("./mock_rocket");
const supData = require("./mock_supdata");
const respond = require("../lib/respond");
const {getMessage, stageToMessage, messageList} = require('../lib/messages');
const { findNextResponseForUser } = require("./mock_supdata");

chai.should();

describe("Responses", function() {
    before(function (){
        this.msg = (name, ...params) => getMessage(name, ...params);
    });
    beforeEach(function() {
        this.timer = sinon.useFakeTimers(Date.parse("2022-04-28 12:00:00 UTC"));

        this.message = {
            u: {
                username: "test-suite",
                _id: "my-id"
            },
            unread: true,
            msg: "my mock message",
            rid: "roomId"
        }
        supData.bot_id = "bot-id";
        this.infoObj = {
            response: {
                messages: ["a"],
                stage: 1
            },
            group: {
                fname: "test-group"
            }
        };
        supData.findNextResponseForUser.returns(this.infoObj);
        rocket.driver.getDirectMessageRoomId.returns("roomId");
    });
    afterEach(function() {
        rocket.driver.reset();
        supData.reset();
        this.timer.restore();
    });
    it("does not answer itself", async function() {
        this.message.u._id = supData.bot_id;
        await respond(null, this.message);
        rocket.driver.getDirectMessageRoomId.called.should.be.true;
        rocket.driver.getDirectMessageRoomId.getCall(0).args[0].should.be.eq(this.message.u.username);
        supData.findNextResponseForUser.called.should.be.false;
    });
    it("does not answer to non-DMs", async function() {
        this.message.rid = "somewhere-else";
        await respond(null, this.message);
        rocket.driver.getDirectMessageRoomId.called.should.be.true;
        rocket.driver.getDirectMessageRoomId.getCall(0).args[0].should.be.eq(this.message.u.username);
        supData.findNextResponseForUser.called.should.be.false;
    });
    it("does not answer to read messages", async function() {
        this.message.unread = false;
        await respond(null, this.message);
        rocket.driver.getDirectMessageRoomId.called.should.be.true;
        rocket.driver.getDirectMessageRoomId.getCall(0).args[0].should.be.eq(this.message.u.username);
        supData.findNextResponseForUser.called.should.be.false;
    });
    it("sends people into weekend", async function() {
        this.timer.restore();
        let t = sinon.useFakeTimers(Date.parse("2022-04-30 12:00:00 UTC"));
        await respond(null, this.message);
        rocket.driver.getDirectMessageRoomId.called.should.be.true;
        rocket.driver.getDirectMessageRoomId.getCall(0).args[0].should.be.eq(this.message.u.username);
        rocket.driver.sendToRoomId.called.should.be.true;
        rocket.driver.sendToRoomId.getCall(0).args[1].should.be.eq("roomId");
        rocket.driver.messages.length.should.be.eq(1);
        supData.findNextResponseForUser.called.should.be.false;
        t.restore();
    });
    it("ignores if no pending messages are available", async function() {
        supData.findNextResponseForUser.returns({response: null, groups: null});
        await respond(null, this.message);
        supData.findNextResponseForUser.called.should.be.true;
        rocket.driver.sendToRoomId.called.should.be.true;
        rocket.driver.sendToRoomId.getCall(0).args[0].should.be.eq(this.msg(messageList.UNKOWN));
    });
    it("processes /redo command", async function() {
        let obj = {
            response: {
                stage: 2,
                messages: ["a","b"]
            },
            group: "test-group"
        };
        supData.findNextResponseForUser.returns(obj);
        this.message.msg = "/redo";
        await respond(null, this.message);
        obj.response.stage.should.be.eq(0);
        obj.response.messages.length.should.be.eq(0);
        rocket.driver.sendToRoomId.called.should.be.true;
        rocket.driver.messages[0].should.be.eq(this.msg(messageList.REDO));
    });
    it("processes /help command", async function() {
        this.message.msg = "/help";
        await respond(null, this.message);
        rocket.driver.messages[0].should.be.eq(this.msg(messageList.INTRODUCTION));
    });
    it("processes unkown command", async function() {
        this.message.msg = "/woasteuh9";
        await respond(null, this.message);
        rocket.driver.messages[0].should.be.eq(this.msg(11, {command: "/woasteuh9", list: "/redo, /help"}))
    });
    it("stores a message", async function() {
        await respond(null, this.message);
        this.infoObj.response.stage.should.be.eq(2);
        this.infoObj.response.messages.should.include(this.message.msg);
    });
    it("does not send instructions if already done", async function() {
        //don't send info
        supData.getUserSettings.returns({instructions_sent: true});
        await respond(null, this.message);
        rocket.driver.messages[0].should.not.be.eq(this.msg(messageList.INTRODUCTION));
        supData.store.called.should.be.false;
        rocket.driver.messages[0].should.be.eq(this.msg(stageToMessage(1)));
    });
    it("checks if another group", async function() {
        let nextInfo = {
            response: {
                messages: [],
                stage: 0
            },
            group: {
                fname: "other-group"
            }
        };
        supData.findNextResponseForUser.onCall(0).returns(this.infoObj);
        supData.findNextResponseForUser.onCall(1).returns(nextInfo);
        supData.getUserSettings.returns({instructions_sent: true});
        await respond(null, this.message);
        rocket.driver.messages[0].should.be.eq(this.msg(stageToMessage(0), nextInfo));
    });
    it("says goodbye if all answers have been given", async function() {
        this.infoObj.response.stage = 3;
        supData.findNextResponseForUser.onCall(0).returns(this.infoObj);
        supData.findNextResponseForUser.onCall(1).returns(null);
        supData.getUserSettings.returns({instructions_sent: true});
        await respond(null, this.message);
        rocket.driver.messages[0].should.be.eq(this.msg(stageToMessage(3), this.infoObj));
    });
})

