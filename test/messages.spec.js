const {expect, assert} = require("chai");
const msg = require("../lib/messages");

describe("Messages", () => {
    it("has keys in messageList", () => {
        assert(Object.keys(msg.messageList).length > 0);
    });
    it("has stages defined", () => {
        assert(msg.stageToMessage(0) === msg.messageList.DONE_SINCE_YESTERDAY);
    });
    it("creates a message", () => {
        const expected = "Steht dir irgendwas im Weg?";
        assert(msg.getMessage(msg.messageList.OBSTACLES) === expected);
    });
    it("enters valid data", () => {
        const expected = `Hey @here, @test hat noch einen Stand-Up nachgeliefert👌🐱‍👓\r\n`
        expect(msg.getMessage(msg.messageList.LATE_SUMMARY, {user: "test"})).to.be.eq(expected);
    });
    it("responds with unknown on invalid id", () => {
        const expected = `Ich melde mich wieder, wenn ich etwas neues wissen muss 😜.`;
        expect(msg.getMessage(1234)).to.be.eq(expected);
    });
})