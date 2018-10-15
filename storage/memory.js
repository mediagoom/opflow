const basestorage = require('./basestorage');
const dbg    = require('debug')('opflow:memorystorage');

/*
const dbg    = require('debug')('opflow:memorystorage');

/  * global performance *  /

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
*/

module.exports = class memorystorage extends basestorage  {
    
    constructor()
    {
        super();
        this.flows = {};
    }

    async save_flow(flow)
    {
        const storageflow = this.json_flow_to_storage_flow(flow);
        this.flows[storageflow.flow.id] = storageflow;
    }

    async reset()
    {
        this.flows = {};
    }
    
    async load_operations(nomore)
    {
        let operations = [];
        let keys = Object.keys(this.flows);
        
        for(let k = 0; k < keys.length; k++)
        {
            
            const flow = this.flows[keys[k]];
            
            //find first not compleated
            const op = flow.operations.find(element => {
                return false === element.completed;
            });

            if(undefined === op)
            {
                continue;
            }

            const join = flow.joinsparents[op.id];

            if(undefined === join)
            {
                operations.push(op);
                if(operations.length >= nomore)
                    return;
            }
            else
            {
                for(let idx = 0; idx < join.length; idx++)
                {   
                    const opdep = await this.get_operation(join[idx]);
                    if(!opdep.completed)
                    {
                        operations.push(opdep);
                        if(operations.length >= nomore)
                            return;
                    }

                }

                //we get here all dependency are completed
                operations.push(op);
                if(operations.length >= nomore)
                    return;
            }

        }

        return operations;
    }

    async get_operation(operationid)
    {
        if(undefined === operationid)
        {
            throw new basestorage.storageError('undefined operationid to get_operations');
        }

        const flowid = this.flow_id(operationid);

        const operations = this.flows[flowid].operations;

        return operations.find(element => {return element.id === operationid;});
    }

    async complete_operation(operation)
    {
        const op = await this.get_operation(operation.id);
        
        if(op.completed)
            basestorage.throw_storage_error('OPERATIONS ALREADY COMPLETED ' + op.id);

        dbg('COMPLETED', op.name, op.type, op.id);
        op.completed = true;
    }

    /*
    async get_direct_parent(operation)
    {

    }

    async get_direct_dependents(operation)
    {

    }
    */
    
};