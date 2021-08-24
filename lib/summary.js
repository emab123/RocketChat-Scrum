const rocket = require("rocketchat-js-sdk");
const supData = require("./data");
const {getMessage, stageToMessage, messageList} = require("./messages");
const logger = require("loglevel");

async function sendImmediate(g) {
    logger.debug("Checking for immediates")
    let immediates = g.completeResponses;
    if(immediates.length === 0)
        return;
    //send
    for(let response of immediates) {
        let msg = rocket.driver.prepareMessage(getMessage(messageList.LATE_SUMMARY, {group: g, ...response}), g._id);
        msg.attachments = [];
        for(let i=0; i < 3; i++) {
            msg.attachments.push({
                title: getMessage(stageToMessage(i), {group: g, ...response}),
                fields: [{
                    short: false,
                    value: `> ${response.messages[i]}`
                }]
            });
        }
        await rocket.driver.sendMessage(msg);
    }
    //clear out remaining ones
    g.clearResponses(e => e.stage !== 4);
}

async function sendSummary(group) {
    logger.info("Processing summary for group", group.name);
    let completed = group.completeResponses;
    
    let incomplete = group.incompleteResponses;
    let unsubmitted = '';
    for (let s of incomplete) {
        unsubmitted += " @" + s.user;
    }
    
    let mes = rocket.driver.prepareMessage(getMessage(messageList.SUMMARY), group._id);
    mes.attachments = [];
    for(let i=0; i<3; i++) {
        mes.attachments.push({
            title: getMessage(stageToMessage(i), {group}),
            fields: [{
                short: false,
                value: completed.map(e => `> **${e.user}**: ${e.messages[i]}`).join("\n")
            }]
        });
    }
    logger.info("Adding incomplete");
    await rocket.driver.sendMessage(mes);
    //send second message for users that have not reported
    if(incomplete.length) {
        await rocket.driver.sendToRoomId(getMessage(messageList.UNSUBMITTED, unsubmitted), group._id);
    }
    //clear group_responses, as they have been reported
    group.clearResponses(e => e.stage !== 4);
}

async function summary() {
    //refresh the groups
    await supData.findGroups();
    logger.info("Following groups are present", supData.groups.map(e => e.name));
    //is there something to report?
    let processed = false;
    let now = new Date();
    for(let g of supData.groups) {
        if(g.isSummarizedReportTime(now)) {
            await sendSummary(g);
            //persist summary
            g.last_summary = now;
            processed = true;
        }
        else if(g.isReportTime(now)) {
            await sendImmediate(g);
            processed = true;
        }
    }
    if(processed) {
        //persist, as data should have changed (at least report was generated and filtered)
        await supData.store();
    }
}

exports.run = summary;
