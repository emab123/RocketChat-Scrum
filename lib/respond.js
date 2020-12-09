const rocket = require("rocketchat-js-sdk");
const standupData = require("./data");
const {getStateMessage} = require("./messages");

async function processMessages(err, message, messageOptions) {
    const roomname = await rocket.driver.getDirectMessageRoomId(message.u.username);
    let now = new Date();
    //only respond on weekdays
    if (now.getDay() === 0 || now.getDay() === 6) {
        await rocket.driver.sendToRoom("Hey, es ist Wochenende! Mach doch einfach mal Feierabend :partyblob: ...", roomname);
        return;
    }
    if (message.u._id === standupData.bot_id) {
        return;
    }
    //direct messaging power up
    if (message.rid !== roomname) {
        return;
    }
    //is it an old message?
    if(!message.unread) {
        return;
    }
    //get next message
    let resp = standupData.responses.find(e => e.user === message.u.username);
    if(!resp) {
        await rocket.driver.sendToRoom("Hey, gerade steht nichts an ... ich melde mich!", roomname);
        return;
    }
    //the response from the user will be added to the internal responses
    if (resp.state > 0 && resp.state < 4) {
        console.log("Stored message for state", resp.state-1, "for user", message.u.username);
        resp.messages.push(message.msg);
    }
    //get next question
    let msg = getStateMessage(resp.state, resp.group);
    resp.state++;
    if(resp.state >= 4) {
        console.log("Daily complete for user", message.u.username);
    }
    //send the message
    await rocket.driver.sendToRoom(msg, roomname);
}

module.exports = processMessages;