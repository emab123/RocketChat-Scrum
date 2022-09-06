const log = require("loglevel").getLogger("MOCK");
const rocket = require("rocketchat-js-sdk");
const sinon = require("sinon");

if(process.env.DEBUG) {
    log.setLevel(log.levels.DEBUG);
}

for(let m of ["asyncCall", "logout", "connect", "disconnect", "getDirectMessageRoomId", "subscribeToMessages", "reactToMessages"]) {
    sinon.stub(rocket.driver, m);
}

sinon.stub(rocket.driver, "login").callsFake(function() {
    rocket.driver.asteroid = {
        loggedIn: true,
        logout() {
            this.loggedIn = false;
        }
    };
    return "bot-id";
});

rocket.driver.messages = [];

sinon.stub(rocket.driver, "sendMessage").callsFake(function(msg) {
    this.messages.push(msg);
});
sinon.stub(rocket.driver, "sendToRoomId").callsFake(function(msg) {
    this.messages.push(msg);
})

rocket.driver.reset = function() {
    this.messages = [];
    for(let m of ["asyncCall", "logout", "connect", "disconnect", "getDirectMessageRoomId", "subscribeToMessages", "reactToMessages", "sendToRoomId", "sendMessage"]) {
        rocket.driver[m].resetHistory();
    }
    rocket.api.get.resetHistory();
}

sinon.stub(rocket.api, "get");

module.exports = rocket;
