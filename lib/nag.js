const rocket = require("rocketchat-js-sdk");
const {getMessage, messageList} = require("./messages");
const supData = require("./data");
const log = require("loglevel");

async function notifyPending() {
    log.info("Iterating pending users");
    //iterate all pending ones
    //exclude those, who are already notified for today, but have not responded yet (as being part of different groups)
    let unnotified = [];
    for(let u of supData.pending) {
        if(!u.status || u.status === "offline") {
            log.debug("Not nagging", u.name);
            unnotified.push(u);
            continue;
        }
        //initially set instructions_sent to false -> first time they are always presented
        supData.setUserSettings(u.username, {instructions_sent: false});
        //prepare message
        try {
            let userRoom = await rocket.driver.getDirectMessageRoomId(u.username);
            await rocket.driver.sendMessage({ rid: userRoom, msg: getMessage(messageList.BEGIN, {name: u.name}) });
        } catch(e) {
            log.error(`Error when sending DM to ${u.name}`)
            log.error(e);
        }
    }
    supData.pending = unnotified;
}

async function doNag() {
    let now = new Date();
    if(!supData.isNagTime(now)) {
        //always notify pending ones
        await notifyPending();
        await supData.store();
        return;
    }
    log.debug("Nagging started");
    //prepare messaging
    //search groups
    await supData.findGroups();
    //iterate groups and add members to pending
    for(let g of supData.groups) {
        //update member list (and presence)
        await g.findUsers();
        log.debug("Searched users -> make them pending");
        //store all users as pending, if the time has come
        supData.setUsersOfGroupPending(g);
        //clear old responses
        g.clearResponses(() => true);
        //update the nag time
        for(let u of g.users.values()) {
            //pre-generate responses
            g.responses.push({
                user: u,
                stage: 0,
                messages: []
            });
        }
        log.debug(`Created ${g.responses.length} response containers`);
    }
    //notify all online users now
    await notifyPending();
    //store
    supData.nag.last = supData.nag_time;
    await supData.store();
}

let running = false;
let interval = null;
exports.setup = async function(register = true) {
    const fn = async () => {
        if(running)
            return;
        try {
            running = true;
            await doNag();
        } finally {
            running = false;
        }
    };
    await fn();
    if(register)
        interval = setInterval(fn, 30000);
    return interval;
}

exports.stop = function() {
    if(!!interval)
        clearInterval(interval);
    interval = null;
}