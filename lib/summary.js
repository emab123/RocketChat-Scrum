const rocket = require("rocketchat-js-sdk");
const supData = require("./data");
const {getMessage, stageToMessage, messageList} = require("./messages");
const logger = require("loglevel");

async function sendImmediate(g) {
    logger.debug("Checking for immediates")
    let immediates = g.completeResponses;
    if(immediates.length === 0)
        return;
    
    // Send simple text messages instead of complex attachments
    for(let response of immediates) {
        let message = `${response.user.username} hat noch einen Stand-Up nachgeliefert:\n\n`;
        
        for(let i=0; i < 3; i++) {
            if(response.messages[i] && response.messages[i].trim()) {
                const questionText = getMessage(stageToMessage(i), {group: g, ...response});
                message += `**${questionText}**\n> ${response.messages[i]}\n\n`;
            }
        }
        
        await rocket.driver.sendToRoomId(message, g._id);
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
        unsubmitted += " @" + s.user.username;
    }
    
    // Send a simple text message instead of complex message structure
    let summaryText = `📊 Scrum de ${group.fname}:\n\n`;
    
    if (completed.length > 0) {
        for(let i=0; i<3; i++) {
            const questionText = getMessage(stageToMessage(i), {group});
            summaryText += `**${questionText}**\n`;
            
            for(let response of completed) {
                if(response.messages[i] && response.messages[i].trim()) {
                    summaryText += `• **${response.user.username}**: ${response.messages[i]}\n`;
                }
            }
            summaryText += '\n';
        }
    } else {
        summaryText += "Nenhuma resposta foi obtida para o Scrum de hoje.\n\n";
    }
    
    // Send the summary
    await rocket.driver.sendToRoomId(summaryText, group._id);
    
    // Send incomplete users message if needed
    if(incomplete.length) {
        await rocket.driver.sendToRoomId(`Ainda não responderam:${unsubmitted}`, group._id);
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
        logger.debug(`Checking summary type: Group: ${g.summary_time}, ${g.last_summary} / Now: ${now}`);
        logger.debug(`Report Time: ${g.isReportTime(now)}`);
        logger.debug(`IsSummarizedReportTime: ${g.isSummarizedReportTime(now)}`);
        if(g.isSummarizedReportTime(now)) {
            logger.debug(`Full summary for group ${g.name}`)
            try {
                await sendSummary(g);
                //persist summary
                g.last_summary = now;
                processed = true;
                logger.info(`✅ Summary sent successfully for group ${g.name}`);
            } catch(e) {
                logger.error(`Failed to send summary: ${e.message}`);
                logger.debug(e);
            }
        }
        else if(g.isReportTime(now)) {
            logger.debug(`It should be reported immediately for group ${g.name}`);
            try {
                await sendImmediate(g);
                processed = true;
                logger.info(`✅ Immediate summary sent for group ${g.name}`);
            } catch(e) {
                logger.error(`Failed to send immediate summary: ${e.message}`);
                logger.debug(e);
            }
        }
    }
    if(processed) {
        //persist, as data should have changed (at least report was generated and filtered)
        await supData.store();
    }
}

exports.run = summary;
