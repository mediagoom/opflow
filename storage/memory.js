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

function operation_is_runnable(element)
{
    const time = new Date();

    if(element.completed)
        return false;

    if(null != element.asof)
    {
        if(element.asof > time)
        {
            dbg('found future operation: ', element.name, element.id, element.asof);
            return false;
        }
    }

    if(null != element.leasetime)
    {
        if(element.leasetime > time)
        {
            dbg('found working operation: ', element.name, element.id, element.leasetime);
            return false;
        }
    }

    //now we have a candidate

    return true;
}

async function operation_has_parent_completed(op, flow, mem)
{
    let processop = false;
    const parentid = flow.parents[op.id];
                
    if(
        'START' == op.type
                    && (undefined === parentid) 
    )
        processop = true;
    else
    {
        //is our parent compleated
        const opdep = await mem.get_operation(parentid);
        if(true === opdep.completed && true === opdep.successed)
        {
            processop = true;
        }
    }

    return processop;
}


module.exports = class memorystorage extends basestorage  {
    
    constructor(typemap)
    {
        super(typemap);
        this.flows = {};
    }
    
    async save_flow(flow)
    {
        const storageflow = this.json_flow_to_storage_flow(flow);
        this.flows[storageflow.flow.id] = storageflow;

        return storageflow.flow.id;
    }

    async reset()
    {
        this.flows = {};
    }

    async lease_operations(operations)
    {           

        for(let idx = 0; idx < operations.length; idx++)
        {
            const element = operations[idx];
            const type = await this.get_type(element.type);

            let time =  new Date();
            time.setSeconds(time.getSeconds() + type.lease);

            element.leasetime = time;

            dbg('leasing op:', element.name, element.id, element.leasetime, type.lease, element.type);
        }
        
        return operations;
    }

    async is_flow_completed(flownid)
    {
        const flow = this.flows[flownid];

        if(undefined === flow)
        {
            basestorage.throw_storage_error('invalid flow name');
        }

        const op = flow.operations.find( el => {return !el.completed;});

        if(undefined === op)
        {
            return true;
        }

        return false;
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
                return operation_is_runnable(element);
            });

            if(undefined === op)
            {
                continue;
            }

            const join = flow.joinsparents[op.id];

            if(undefined === join) //we are not the son of a join
            {
                let processop = await operation_has_parent_completed(op, flow, this);                

                if(processop)
                {
                    dbg('found op to run: ', JSON.stringify(Object.assign({}, op, {children : null}), null, 4));
                    operations.push(op);
                    if(operations.length >= nomore)
                        return await this.lease_operations(operations);
                }
            }
            else
            {
                let all_completed = true;

                for(let idx = 0; idx < join.length; idx++)
                {   
                    const opdep = await this.get_operation(join[idx]);
                    if(!opdep.completed)
                    {
                        all_completed = false;
                        if(operation_is_runnable(opdep))
                        {

                            let processop = await operation_has_parent_completed(opdep, flow, this);                
                            
                            if(processop)
                            {
                                
                                operations.push(opdep);
                                if(operations.length >= nomore)
                                    return await this.lease_operations(operations);
                            }
                        }
                    }
                }

                if(all_completed)
                {
                    //we get here all join parents are completed
                    operations.push(op);
                    if(operations.length >= nomore)
                        return await this.lease_operations(operations);
                }
            }

        }

        return await this.lease_operations(operations);
    }

    async get_operation(operationid)
    {
        if(undefined === operationid)
        {
            basestorage.throw_storage_error('undefined operationid to get_operations');
        }

        const flowid = this.flow_id(operationid);

        const operations = this.flows[flowid].operations;

        return operations.find(element => {return element.id === operationid;});
    }

    async complete_operation(operation, success)
    {
        const op = await this.get_operation(operation.id);
        
        if(op.completed)
            basestorage.throw_storage_error('OPERATIONS ALREADY COMPLETED ' + op.id);

        dbg('COMPLETED', op.name, op.type, op.id);
        op.successed = success;
        op.completed = true;
        op.modified = new Date();
    }

    async get_operation_history(operation)
    {
        return operation.history;
    }

    async get_operation_failures_count(operation)
    {
        const failure = operation.history.filter(element => {return !element.success;});
        return failure.length;
    }

    async set_operation_asof(operation, asof)
    {
        operation.asof = asof;
    }

    async add_history(operation, message, success)
    {
        if(null === operation.history)
            operation.history = new Array();

        operation.history.push(
            {
                date : new Date()
                , message : message
                , success : success
            }
        );

        operation.leasetime = null;
    }

    async reset_op(op)
    {
        op.successed = false;
        op.completed = false;
        op.executed  = false;
        op.leasetime = undefined;
        op.modified = new Date();
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