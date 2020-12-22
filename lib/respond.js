const rocket = require("rocketchat-js-sdk");
const standupData = require("./data");
const {getMessage, messageList, stageToMessage} = require("./messages");

async function processMessages(err, message, messageOptions) {
    const roomname = await rocket.driver.getDirectMessageRoomId(message.u.username);
    let now = new Date();
    //only respond on weekdays
    if (now.getDay() === 0 || now.getDay() === 6) {
        await rocket.driver.sendToRoomId(getMessage(messageList.WEEKEND), roomname);
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
        await rocket.driver.sendToRoomId(getMessage(messageList.UNKNOWN), roomname);
        return;
    }
    if(message.msg.startsWith("/")) {
        //command
        switch(message.msg) {
            case "/redo":
                resp.stage = 0;
                resp.messages = [];
                await rocket.driver.sendToRoomId(getMessage(messageList.STARTING_OVER), roomname);
                break;
            default:
                await rocket.driver.sendToRoomId(getMessage(messageList.UNKNOWN_COMMAND, {command: message.msg, list: "/redo"}), roomname);
                break;
        }
        //don't continue here
        return;
    }
    //the response from the user will be added to the internal responses
    if (resp.stage > 0 && resp.stage < 4) {
        console.log("Stored message for stage", resp.stage-1, "for user", message.u.username);
        resp.messages.push(message.msg);
    }
    let u = standupData.users.get(message.u.username);
    if(!u.instructions_sent) {
        await rocket.driver.sendToRoom(getMessage(messageList.INTRODUCTION));
        u.instructions_sent = true;
        standupData.users.set(message.u.username, u);
    }
    //get next question
    let msg = getMessage(stageToMessage(resp.stage), resp);
    resp.stage++;
    if(resp.stage >= 4) {
        console.log("Daily complete for user", message.u.username);
    }
    //send the message
    await rocket.driver.sendToRoomId(msg, roomname);
}

module.exports = processMessages;