const rocket = require("rocketchat-js-sdk");
const supData = require("./data");
const {getStateMessage} = require("./messages");

async function sendImmediate() {
    let immediates = supData.responses.filter(e => e.state === 4);
    //send
    for(let response of immediates) {
        let message = 'Hey @here, @' + response.user + ' hat noch einen Stand-Up nachgeliefert👌🐱‍👓\r\n';
        message += `**1. ${getStateMessage(0, response.group)}**\r\n`;
        message += '> ' + response.messages[0] + '\r\n';
        message += '** ** \r\n';
        message += `**2. ${getStateMessage(1, response.group)}**\r\n`;
        message += '> ' + response.messages[1] + '\r\n';
        message += '** ** \r\n';
        message += `**3. ${getStateMessage(2, response.group)}**\r\n`;
        message += '> ' + response.messages[2] + '\r\n';
        await rocket.driver.sendToRoom(message, response.group.name);
    }
    //clear out remaining ones
    supData.responses = supData.responses.filter(e => e.state !== 4);
}

async function sendSummary() {
    for(let group of supData.groups) {
        let silents = supData.responses.filter(e => e.group._id === group._id && e.state === 4);
        let normals = supData.responses.filter(e => e.group._id === group._id && e.state !== 4);
        let message0 = '',
            message1 = '',
            message2 = '',
            unsubmitted = '';

        for (let s of silents) {
            unsubmitted += " @" + s.user;
        }

        if(silents.length) {
            unsubmitted = 'Folgende haben leider nichts berichtet: ' + unsubmitted;
        }

        for (let n of normals) {
            message0 += '> ' + n.user + '\n' + '> ' + n.messages[0] + '\n' + '** ** \n'
            message1 += '> ' + n.user + '\n' + '> ' + n.messages[1] + '\n' + '** ** \n'
            message2 += '> ' + n.user + '\n' + '> ' + n.messages[2] + '\n' + '** ** \n'
        }
        await rocket.driver.sendToRoom(
            'Hey @here, hier der Daily Stand-up des Teams :coffee::\n' +
                `**1. ${getStateMessage(0, group)}**\n` +
                '> ' + message0 + '\n' +
                '** ** \n' +
                `**2. ${getStateMessage(1, group)}**\n` +
                '> ' + message1 + '\n' +
                '** ** \n' +
                `**3. ${getStateMessage(2, group)}**\n` +
                '> ' + message2 + '\n' +
                unsubmitted
            , group.name);
    }
    //clear group_responses, as they have been reported
    supData.responses = supData.responses.filter(e => e.state !== 4);
}

async function summary() {
    let now = new Date();
    //Sunday: 0, Saturday: 6
    if(now.getDay() === 0 || now.getDay() === 6) {
        return;
    }
    let summary = supData.summary_time;
    if(now > summary) {
        //is there something to report?
        let hasReport = supData.responses.find(e => e.state === 4) !== null;
        if(!hasReport)
            return;
        //potentially send summary
        if(supData.last_summary < summary) {
            await sendSummary();
            //we need to create the summary
            supData.last_summary = summary;
        }
        else {
            //immediate send out!
            await sendImmediate();
        }
        //persist, as data should have changed (at least report was generated and filtered)
        await supData.store();
    }
}

let running = false;
let interval = null;

exports.setup = function() {
    const fn = async () => {
        if(running)
            return;
        try {
            running = true;
            await summary();
        } finally {
            running = false
        }
    }
    //trigger immediately and start spinning
    fn();
    interval = setInterval(fn, 30000);
}

exports.stop = function() {
    if(!!interval) {
        clearInterval(interval);
    }
    interval = null;
}