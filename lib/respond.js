const log = require("loglevel");
const rocket = require("rocketchat-js-sdk");
const { login } = require("rocketchat-js-sdk/dist/lib/driver");
const standupData = require("./data");
const {getMessage, messageList, stageToMessage} = require("./messages");

async function processMessages(err, message, messageOptions) {
    log.debug("Received message:", { err, message, messageOptions });
    const roomname = await rocket.driver.getDirectMessageRoomId(message.u.username);
    log.debug("Calculated DM roomname:", roomname);

    let now = new Date();
    if (message.u._id === standupData.bot_id) {
        log.debug("Message from bot itself, ignoring.");
        return;
    }
    if (message.rid !== roomname) {
        log.debug("Message not in DM room, ignoring.");
        return;
    }
    // Remove the unread check to process all DM messages
    // if(!message.unread) {
    //     log.debug("Message is not unread, ignoring.");
    //     return;
    // }
    if (typeof message.unread === "undefined") {
        log.warn("Message.unread property is undefined; processing anyway.");
    }
    //only respond on weekends
    if (now.getDay() === 0 || now.getDay() === 1 || now.getDay() === 3) {
        log.debug("It's not Scrum Day, sending WEEKEND message.");
        await rocket.driver.sendToRoomId(getMessage(messageList.WEEKEND), roomname);
        return;
    }
    let info = standupData.findNextResponseForUser(message.u);
    log.debug("Next response info:", info);
    if(!info.response) {
        log.debug("No pending response for user, sending UNKNOWN message.");
        await rocket.driver.sendToRoomId(getMessage(messageList.UNKNOWN), roomname);
        return;
    }
    if(message.msg.startsWith("!")) {
        log.debug("Processing command:", message.msg);
        switch(message.msg) {
            case "!redo":
                info.response.stage = 0;
                info.response.messages = [];
                log.debug("Redo command processed, sending REDO message.");
                await rocket.driver.sendToRoomId(getMessage(messageList.REDO), roomname);
                break;
            case "!help":
                log.debug("Help command processed, sending INTRODUCTION message.");
                await rocket.driver.sendToRoomId(getMessage(messageList.INTRODUCTION), roomname);
                break;
            default:
                await rocket.driver.sendToRoomId(getMessage(messageList.UNKNOWN_COMMAND, {command: message.msg, list: "redo, help"}), roomname);
                break;
        }
        return;
    }
    //the response from the user will be added to the internal responses
    if (info.response.stage > 0 && info.response.stage < 4) {
        log.info("Stored message for stage", info.response.stage-1, "for user", message.u.username, "in group", info.group.fname);
        info.response.messages.push(message.msg);
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
    let msg = getMessage(stageToMessage(info.response.stage), info);
    info.response.stage++;
    let next_info = standupData.findNextResponseForUser(message.u);
    if(!next_info?.group) {
        log.info("Daily complete for user", message.u.username);
    } else if (next_info.group !== info.group) {
        log.info("Continuing with next group", next_info.group.fname);
        //update msg
        msg = getMessage(stageToMessage(next_info.response.stage), next_info);
    } else {
        log.debug("User still has answers left ...");
    }
    //send the message
    await rocket.driver.sendToRoomId(msg, roomname);
}

module.exports = processMessages;