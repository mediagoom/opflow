const dbg    = require('debug')('opflow:operations');



const processor_map = {
    'system' : {
        'NULL' : async function(config, bag, context) { dbg('NULL PROCESSING', JSON.stringify(config, null, 4), JSON.stringify(bag, null, 4), JSON.stringify(context.parent, null, 4)); return 'NULL'; }
        , 'START' : async function(config, bag/*, context*/) { dbg('START PROCESSING', config, bag); return 'START'; }
        , 'END' : async function(config, bag/*, context*/) { dbg('END PROCESSING', config, bag); return 'END'; }
        , 'JOIN' : async function(config, bag/*, context*/) { dbg('JOIN PROCESSING', config, bag); return 'JOIN'; }
        , 'IF' : async function(config, bag/*, context*/) { dbg('IF PROCESSING', config, bag); return 'IF'; }
        , 'WHILE' : async function(config, bag/*, context*/) { dbg('WHILE PROCESSING', config, bag); return 'WHILE'; }
        , 'LOOP' : async function(config, bag/*, context*/) { dbg('LOOP PROCESSING', config, bag); return 'LOOP'; }
        , 'ERROR' : async function(config, bag/*, context*/) { dbg('ERROR PROCESSING', config, bag); return 'ERROR'; }
    }
};

/**  */
class OperationManager
{
    constructor(){
        this.processmap = processor_map;
    }

    

}

class FlowManager
{
    constructor(operationstorage)
    {
        this.storage = operationstorage;
    }    

    async save_flow(flow)
    {
        return this.storage.save_flow(flow);
    }

    async load_operations(nomore)
    {
        return this.storage.load_operations(nomore);
    }

    async complete_operation(operation)
    {
        return this.storage.complete_operation(operation);
    }

    /*
    async get_direct_dependents(operation)
    {

    }

    
    async register_failure(operation)
    {

    }
    */

}

//const Operation = new OperationManager();
//const Flow = new FlowManager();

module.exports = {OperationManager, FlowManager};