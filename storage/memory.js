const base = require('./base');
const dbg  = require('debug')('opflow:memorystorage');

const OPERATION_CHANGE = Object.freeze({
    START : 'START'
    , END : 'END'
    , AsOF : 'AsOF'
    , HISTORY : 'HISTORY'
    , LEASE : 'LEASE'
    , COMPLETE : 'COMPLETE'
    , RESET : 'RESET'
});

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

    if(undefined === op)
        throw 'Invalid operation for parent';

    let process_operation = false;
    const parent_id = flow.parents[op.id];
                
    if(undefined === parent_id) 
    {
        if(op.type === 'START')
            process_operation = true;
        else
            throw 'Invalid parent for ' + op.id;
    }
    else
    {
        //is our parent completed
        const operation_dependency = await mem.get_operation(parent_id);
        if(true === operation_dependency.completed && true === operation_dependency.succeeded)
        {
            process_operation = true;
        }
    }

    return process_operation;
}

function add_to_operations_if_not_there(op, operations)
{
    let e = undefined;
    
    if(0 < operations.length) //if(0 < op.length)
        e = operations.find((el) => {return el.id == op.id;});

    if(undefined === e)
    {
        operations.push(op);
        return true;
    }

    return false;
}

async function evaluate_operation_lease(operations, no_more, flow, op, mem)
{
    let ret = false;
    const join = flow.joinsparents[op.id];

    if(undefined === join) //we are not the son of a join
    {
        let process_operation = await operation_has_parent_completed(op, flow, mem);                

        if(process_operation)
        {
            dbg('found op to run: ', JSON.stringify(Object.assign({}, op, {children : null}), null, 4));
            ret = add_to_operations_if_not_there(op, operations);
            if(operations.length >= no_more)
                return ret;
        }
    }
    else
    {
        let all_completed = true;

        for(let idx = 0; idx < join.length; idx++)
        {   
            let operation_dependency = await mem.get_operation(join[idx]);
            if(!operation_dependency.completed)
            {
                all_completed = false;

                //avoid problem for two consecutive joins
                if('JOIN' === operation_dependency.type)
                    operation_dependency = undefined;
                
                while(undefined !== operation_dependency)
                {
                    if(operation_is_runnable(operation_dependency))
                    {
                        let process_operation = await operation_has_parent_completed(operation_dependency, flow, mem);                
                            
                        if(process_operation)
                        {
                            dbg('found op to run [join]: ', JSON.stringify(Object.assign({}, operation_dependency, {children : null}), null, 4));
                            ret = add_to_operations_if_not_there(operation_dependency, operations);
                            if(operations.length >= no_more)
                                return ret;

                            operation_dependency = undefined;
                        }
                        else
                        {
                            const parent_id = await mem.get_parent(operation_dependency);
                            operation_dependency = await mem.get_operation(parent_id);
                            //going up we got an other join
                            if('JOIN' === operation_dependency.type)
                                operation_dependency = undefined;
                        }
                    }
                    else
                    {
                        operation_dependency = undefined;
                    }
                    
                }
            }
        }

        if(all_completed)
        {
            dbg('found op to run [all]: ', JSON.stringify(Object.assign({}, op, {children : null}), null, 4));
                                
            //we get here all join parents are completed
            ret = add_to_operations_if_not_there(op, operations);
            if(operations.length >= no_more)
                return ret;
        }
    }

    return ret;
}



module.exports = class memorystorage extends base  {
    
    constructor(type_map)
    {
        super(type_map);
        this.flows = {};
    }

    init(){this.flows = {};}
   
    async reset()
    {
        this.init();
    }

    async flow_changed(flow, type, operation_id)
    {
        dbg('flow changed', flow.flow.id, type, operation_id);
    }

    async discard_flow(flow_id)
    {
        delete this.flows[flow_id];
    }

    async flow_ended(operation_id)
    {
        const flow_id = this.flow_id(operation_id);
        dbg('flow ended', this.flows[flow_id].flow.id);

        await this.flow_changed(this.flows[flow_id], OPERATION_CHANGE.END);

        this.emit(this.events.END, flow_id);
        
    }

    async operation_changed(operation_id, type)
    {
        const flow = this.flow_id(operation_id);
        await this.flow_changed(this.flows[flow], type, operation_id);
    }
    
    async save_flow(flow)
    {        
        const storage_flow = this.json_flow_to_storage_flow(flow);
        this.flows[storage_flow.flow.id] = storage_flow;
        
        dbg('save flow', storage_flow.flow.id);

        await this.flow_changed(this.flows[storage_flow.flow.id]);

        return storage_flow.flow.id;
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

            dbg('leasing op [%s] %s %s %d %s', element.name, element.id, element.lease_time, type.lease, element.type);
           
            await this.operation_changed(element.id, OPERATION_CHANGE.LEASE);
            
        }
        
        return operations;
    }

    async is_flow_completed(flow_id)
    {
        const flow = this.flows[flow_id];

        if(undefined === flow)
        {
            base.throw_storage_error('invalid flow name ' + flow_id);
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
            const ops = flow.operations.filter(element => {
                return operation_is_runnable(element);
            });

            if(undefined === ops)
            {
                continue;
            }

            for(let j = 0; j < ops.length; j++)
            { 
                const op = ops[j];

                const added = await evaluate_operation_lease(operations, no_more, flow, op, this);

                if(operations.length >= no_more || added)
                    break;
            }

            if(operations.length >= no_more)
                break;

        }

        return await this.lease_operations(operations);
    }

    async get_operation(operation_id)
    {
        if(undefined === operation_id)
        {
            base.throw_storage_error('passed Undefined operation_id to get_operation');
        }

        const flow_id = this.flow_id(operation_id);

        const operations = this.flows[flow_id].operations;

        return operations.find(element => {return element.id === operation_id;});
    }

    async complete_operation(operation, success)
    {
        dbg('COMPLETING [%s] %s', operation.name, operation.id);

        const op = await this.get_operation(operation.id);
        if(op.completed)
            base.throw_storage_error('OPERATIONS ALREADY COMPLETED ' + op.id);

        dbg('COMPLETED [%s] %s -> %s', op.name, op.type, op.id);
        op.succeeded = success;
        op.completed = true;
        op.modified = new Date();

        operation.lease_time = null;

        await this.operation_changed(operation.id, OPERATION_CHANGE.COMPLETE);

        if('END' === operation.type && op.succeeded)
        {
            await this.flow_ended(operation.id);
        }
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

        return this.operation_changed(operation.id, OPERATION_CHANGE.AsOF);
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

        return this.operation_changed(operation.id, OPERATION_CHANGE.HISTORY);
        
    }

    async reset_op(op)
    {
        op.succeeded = false;
        op.completed = false;
        op.executed  = false;
        op.lease_time = undefined;
        op.modified = new Date();

        return this.operation_changed(op.id, OPERATION_CHANGE.RESET);
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

        if(undefined === flow)
            return undefined;

        return this.storage_flow_to_json_flow(flow.operations);
    }

    async get_storage_flow(flow_id)
    {
        const flow = this.flows[flow_id];
        
        if(undefined === flow)
            return undefined;

        return flow.operations;
    }

    async get_active_flows(no_more, options)
    {
        dbg('get_active_flows', options);

        let keys = Object.keys(this.flows);

        const ids = [];
        
        for(let k = 0; k < keys.length; k++)
        {
            const flow = this.flows[keys[k]];

            ids.push(flow.flow.id);
            
            if(ids.length >= no_more)
                return ids;
        }

        return ids;
    }
   
};