const EventEmitter = require('events');

const STORAGEEVENT = Object.freeze({
    NEW:  'new'
    , OPNEW: 'opnew'
    , ERROR:  'error'
});


class basestorage extends EventEmitter{
    
    get events(){ return STORAGEEVENT; }

    raiseEvent(storevent)
    {
        this.emit(storevent);
    }
}

module.exports = basestorage;

//export {basestorage, STORAGEEVENT}