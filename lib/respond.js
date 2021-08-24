const log = require("loglevel");
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
    let resp = standupData.findNextResponseForUser(message.u);
    log.debug("Next repsonse:", resp);
    if(!resp.response) {
        await rocket.driver.sendToRoomId(getMessage(messageList.UNKNOWN), roomname);
        return;
    }
    if(message.msg.startsWith("/")) {
        //command
        log.debug("Processing command");
        switch(message.msg) {
            case "/redo":
                resp.stage = 0;
                resp.messages = [];
                await rocket.driver.sendToRoomId(getMessage(messageList.STARTING_OVER), roomname);
                break;
            case "/help":
                await rocket.driver.sendToRoomId(getMessage(messageList.INTRODUCTION), roomname);
                break;
            default:
                await rocket.driver.sendToRoomId(getMessage(messageList.UNKNOWN_COMMAND, {command: message.msg, list: "/redo, /help"}), roomname);
                break;
        }
        //don't continue here
        return;
    }
    //the response from the user will be added to the internal responses
    if (resp.response.stage > 0 && resp.response.stage < 4) {
        console.log("Stored message for stage", resp.response.stage-1, "for user", message.u.username, "in group", resp.group.fname);
        resp.response.messages.push(message.msg);
    }
    let settings = standupData.getUserSettings(message.u);
    if(!settings) {
        log.debug("Sending instructions and storing settings");
        await rocket.driver.sendToRoomId(getMessage(messageList.INTRODUCTION), roomname);
        settings = { instructions_sent : true };
        standupData.setUserSettings(message.u, settings);
        standupData.store();
    }
    //get next question
    let msg = getMessage(stageToMessage(resp.response.stage), resp);
    resp.response.stage++;
    let next_group = standupData.findNextResponseForUser(message.u).group;
    if(!next_group) {
        log.info("Daily complete for user", message.u.username);
    } else if (next_group !== resp.group) {
        log.info("Continuing with next group", next.group.fname);
    } else {
        log.debug("User still has answers left ...");
    }
    //send the message
    await rocket.driver.sendToRoomId(msg, roomname);
}

module.exports = processMessages;