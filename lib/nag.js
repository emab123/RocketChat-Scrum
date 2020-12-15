const rocket = require("rocketchat-js-sdk");
const {getStateMessage} = require("./messages");
const standupData = require("./data");

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
            console.log("Start nagging");
        }
        let unnotified = [];
        for(let user of standupData.pending) {
            try {
                if(!user.status || user.status === "offline") {
                    console.log("Not nagging", user.name);
                    unnotified.push(user);
                    continue;
                }
                console.log("Waking user", user.username);
                let userRoom = await rocket.driver.getDirectMessageRoomId(user.username);
                await rocket.driver.sendMessage({ rid: userRoom, msg: getStateMessage(-1, user.name) });
                //pre-assign
                for (let g of user.groups) {
                    standupData.responses.push({
                        user: user.username,
                        group: g,
                        state: 0,
                        messages: []
                    });
                }
                //remove this user from the pending group
            } catch (error) {
                console.log('Error when sending DM to ' + user.name);
                console.log(error);
            }
        }
        //update pending list
        standupData.pending = unnotified;
        await standupData.store();
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
            await doNag();
        } finally {
            running = false;
        }
    };
    fn();
    interval = setInterval(fn, 30000);
}

exports.stop = function() {
    if(!!interval)
        clearInterval(interval);
    interval = null;
}