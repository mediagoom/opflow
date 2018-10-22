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

    if(null != element.asOf)
    {
        if(element.asOf > time)
        {
            dbg('found future operation: ', element.name, element.id, element.asOf);
            return false;
        }
    }

    if(null != element.lease_time)
    {
        if(element.lease_time > time)
        {
            dbg('found working operation: ', element.id, element.name, element.lease_time);
            return false;
        }
        else
        {
            dbg('found expired operation: ', element.id, element.name, element.lease_time);
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
        if(true === opdep.completed && true === opdep.succeeded)
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

            element.lease_time = time;

            dbg('leasing op:', element.name, element.id, element.lease_time, type.lease, element.type);
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
    
    async load_operations(no_more)
    {
        let operations = [];
        let keys = Object.keys(this.flows);
        
        for(let k = 0; k < keys.length; k++)
        {
            const flow = this.flows[keys[k]];
            
            //find first not complected
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
                    if(operations.length >= no_more)
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
                                dbg('found op to run [join]: ', JSON.stringify(Object.assign({}, opdep, {children : null}), null, 4));
                                operations.push(opdep);
                                if(operations.length >= no_more)
                                    return await this.lease_operations(operations);
                            }
                        }
                    }
                }

                if(all_completed)
                {
                    dbg('found op to run [all]: ', JSON.stringify(Object.assign({}, op, {children : null}), null, 4));
                                
                    //we get here all join parents are completed
                    operations.push(op);
                    if(operations.length >= no_more)
                        return await this.lease_operations(operations);
                }
            }

        }

        return await this.lease_operations(operations);
    }

    async get_operation(operation_id)
    {
        if(undefined === operation_id)
        {
            basestorage.throw_storage_error('undefined operation_id to get_operations');
        }

        const flow_id = this.flow_id(operation_id);

        const operations = this.flows[flow_id].operations;

        return operations.find(element => {return element.id === operation_id;});
    }

    async complete_operation(operation, success)
    {
        const op = await this.get_operation(operation.id);
        
        if(op.completed)
            basestorage.throw_storage_error('OPERATIONS ALREADY COMPLETED ' + op.id);

        dbg('COMPLETED', op.name, op.type, op.id);
        op.succeeded = success;
        op.completed = true;
        op.modified = new Date();

        operation.lease_time = null;
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

    async set_operation_asOf(operation, asOf)
    {
        operation.asOf = asOf;
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

        
    }

    async reset_op(op)
    {
        op.succeeded = false;
        op.completed = false;
        op.executed  = false;
        op.lease_time = undefined;
        op.modified = new Date();
    }

    async get_parent(operation)
    {
        const flow_id = this.flow_id(operation.id);

        const flow = this.flows[flow_id];
        const join = flow.joinsparents[operation.id];
        
        if(undefined === join)
        {
            return flow.parents[operation.id];
        }

        return join;
    } 
    
    async get_hierarchical_flow(flow_id)
    {
        const flow = this.flows[flow_id];

        return this.storage_flow_to_json_flow(flow.operations);
    }

    async get_storage_flow(flow_id)
    {
        const flow = this.flows[flow_id];
        return flow.operations;
    }
   
};