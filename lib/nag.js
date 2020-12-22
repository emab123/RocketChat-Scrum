const rocket = require("rocketchat-js-sdk");
const {getMessage, messageList} = require("./messages");
const standupData = require("./data");
const log = require("loglevel");

async function doNag() {
    let now = new Date();
    //Sunday: 0, Saturday: 6
    if(now.getDay() === 0 || now.getDay() === 6)
        return;
    let nagTime = standupData.nag_time;
    //only ask once per day
    if(now >= nagTime) {
        //update member list (and presence)
        await standupData.findUsers();
        //store all users as pending, if the time has come
        if(standupData.last_nag < nagTime) {
            standupData.setAllUsersPending();
            standupData.last_nag = nagTime;
            log.debug("Start nagging");
        }
        let unnotified = [];
        for(let user of standupData.pending) {
            try {
                if(!user.status || user.status === "offline") {
                    log.info("Not nagging", user.name);
                    unnotified.push(user);
                    continue;
                }
                log.info("Waking user", user.username);
                let userRoom = await rocket.driver.getDirectMessageRoomId(user.username);
                await rocket.driver.sendMessage({ rid: userRoom, msg: getMessage(messageList.BEGIN, {user}) });
                //pre-assign
                user.instructions_sent = false;
                for (let g of user.groups) {
                    standupData.responses.push({
                        user: user.username,
                        group: g,
                        stage: 0,
                        messages: []
                    });
                }
                //remove this user from the pending group
            } catch (error) {
                log.error('Error when sending DM to ' + user.name);
                log.error(error);
            }
        }
        //update pending list
        standupData.pending = unnotified;
        await standupData.store();
    }
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