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
            return `Oi, ${data.name}. Pronto para o Scrum de hoje? Caso sim, basta responder e eu lhe farei algumas perguntas.`
        case messageList.INTRODUCTION:
            return `Vamos lá!\nPor favor mantenha as repostas curtas e em tópico.`;
        case messageList.DONE_SINCE_YESTERDAY:
            return `O que você fez a respeito de "${data.group.fname}" desde a última atualização?`;
        case messageList.DOING_TODAY:
            return `O que você fará hoje?`;
        case messageList.OBSTACLES:
            return `Há algum impecílio ou algo que você precisa de alguém para continuar seu trabalho?`;
        case messageList.COMPLETE:
            return "Obrigado pela atualização! 👋.\nTenha um bom dia!";
        case messageList.REDO:
            return "Ok, sem problemas! Vamos começar de novo. 👌";
        case messageList.WEEKEND:
            return "Ei, hoje nem é dia. Fica de boa aí!";
        case messageList.SUMMARY:
            return "E aí,\nAqui está o nosso Scrum:";
        case messageList.LATE_SUMMARY:
            return `Opa, @${data.user.username} enviou uma atualização INTEMPESTIVAMENTE!👌🐱‍👓\r\n`;
        case messageList.UNSUBMITTED:
            return `Os seguintes membros não enviaram atualizações: ${data}`;
        case messageList.UNKNOWN_COMMAND:
            return `Eu não conheço o comando ${data.command}... Eu conheço os seguintes comandos ${data.list}`;
        case messageList.UNKNOWN:
        default:
            return "Entrarei em contato se eu precisar de alguma atualização. 😜."
    }
};
