const messageList = {
    UNKNOWN: -1,
    BEGIN: 0,
    INTRODUCTION: 1,
    DONE_SINCE_YESTERDAY: 2,
    DOING_TODAY: 3,
    OBSTACLES: 4,
    COMPLETE: 5,
    REDO: 6,
    WEEKEND: 7,
    UNSUBMITTED: 8,
    LATE_SUMMARY: 9,
    SUMMARY: 10,
    UNKNOWN_COMMAND: 11
};

exports.stageToMessage = function(stage) {
    switch(stage) {
        case 0:
            return messageList.DONE_SINCE_YESTERDAY;
        case 1:
            return messageList.DOING_TODAY;
        case 2:
            return messageList.OBSTACLES;
        default:
            return -1;
    }
}

exports.messageList = messageList;

exports.getMessage = function(id, data) {
    switch(id) {
        case messageList.BEGIN:
            return `Hi, ${data.name}. Bereit für den kurzen Daily? Falls ja, schreibe mir bitte einfach zurück, ich stelle dir dann kurz ein paar Fragen.`
        case messageList.INTRODUCTION:
            return `Los geht's!\nBitte halte dich kurz und schicke mir nur eine Zeile zu meinen Fragen!`;
        case messageList.DONE_SINCE_YESTERDAY:
            return `Was hast du seit gestern für "${data.group.fname}" getan?`;
        case messageList.DOING_TODAY:
            return `Was wirst du heute tun?`;
        case messageList.OBSTACLES:
            return `Steht dir irgendwas im Weg?`;
        case messageList.COMPLETE:
            return "Danke für deine Infos 👋. Ich habe alles was ich brauche!";
        case messageList.REDO:
            return "Ok, nochmal von vorne. Kein Problem 👌";
        case messageList.WEEKEND:
            return "Hey, es ist Wochenende! Mach doch einfach mal Feierabend :partyblob: ...";
        case messageList.SUMMARY:
            return "Hey @here, hier der Daily Stand-up des Teams :coffee::";
        case messageList.LATE_SUMMARY:
            return `Hey @here, @${data.user} hat noch einen Stand-Up nachgeliefert👌🐱‍👓\r\n`;
        case messageList.UNSUBMITTED:
            return `Folgende haben leider nichts berichtet: ${data}`;
        case messageList.UNKNOWN_COMMAND:
            return `Der Befehl ${data.command} ist mir leider nicht bekannt. Ich kenne nur ${data.list}`;
        case messageList.UNKNOWN:
        default:
            return "Ich melde mich wieder, wenn ich etwas neues wissen muss 😜."
    }
};