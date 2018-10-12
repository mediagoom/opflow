/* global performance */
const basestorage = require('./basestorage');
const dbg    = require('debug')('opflow:memorystorage');

function generateUUID() { // Public Domain/MIT
    
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

module.exports = class memorystorage extends basestorage  {
    
    async addFlow(opflow)
    {
        this.raiseEvent(this.events.NEW, generateUUID());

        let op = opflow.tail;

        while(op)
        {
            dbg('Operation in flow', op.name, op.type, op.id);
            op = op.parent;
        }

    }
    
};