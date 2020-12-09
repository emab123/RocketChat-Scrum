exports.getStateMessage = function(state, groupOrUser) {
    switch (state) {
        case -1:
            return `Hi, ${groupOrUser}. Bereit für den kurzen Daily? Falls ja, schreibe mir bitte einfach zurück, ich stelle dir dann kurz ein paar Fragen.`
        case 0:
            return `Los geht's!\nBitte halte dich kurz und schicke mir nur eine Zeile zu meinen Fragen!\nWas hast du seit gestern für "${groupOrUser.fname}" getan?`;
        case 1:
            return `Was wirst du heute tun?`;
        case 2:
            return `Steht dir irgendwas im Weg?`;
        default:
            return "Danke für deine Infos 👋. Ich habe alles was ich brauche!"
    }
};