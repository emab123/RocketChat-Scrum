module.exports.getTime = function(variable, def) {
    if(!variable)
        return def;
    return variable.split(":").map(e => parseInt(e));
}

module.exports.createDate = function(vals) {
    let d = new Date();
    d.setHours(vals[0]);
    d.setMinutes(vals[1]);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

