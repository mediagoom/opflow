//const dbg    = require('debug')('opflow:operations');

/**  */
class flow_manager
{
    constructor(operation_storage)
    {
        this.storage = operation_storage;
    }    

    async save_flow(flow)
    {
        return this.storage.save_flow(flow);
    }

    async load_operations(no_more)
    {
        return this.storage.load_operations(no_more);
    }

    async type_is_system(typename)
    {
        const type = await this.storage.get_type(typename);

        return type.system;
    }

    async get_type_path(typename)
    {
        const type = await this.storage.get_type(typename);

        return type.path;
    }

    async process_system_operation(operation)
    {
        const type = await this.storage.get_type(operation.type);
        
        return type.process(operation.config, operation.propertyBag, operation, this);
    }

    async register_failure(operation, message)
    {
        operation.result = message;
        
        const type = await this.storage.get_type(operation.type);

        await this.storage.add_history(operation, message, false);

        const previous_failures = await this.storage.get_operation_failures_count(operation);

        if(type.retries <= previous_failures )
        {
            await this.storage.complete_operation(operation, false);
        }
        else
        {
            const type = await this.storage.get_type(operation.type);
            let time = new Date();
            time.setSeconds(time.getSeconds() + type.retries_interval);
            await this.storage.set_operation_asOf(operation, time);
        }

        operation.lease_time = null;
    }

    async register_success(operation, message)
    {
        operation.result = message;
        
        await this.storage.add_history(operation, message, true);
        await this.storage.complete_operation(operation, true);
    }

    async reset_operation(operation)
    {
        return this.storage.reset_op(operation);
    }

    async set_operation_asOf(operation, asOf)
    {
        if(undefined === asOf || null === asOf)
        {
            asOf = new Date();
        }
        return this.storage.set_operation_asOf(operation, asOf); 
    }

    async get_operation_history(operation)
    {
        return this.storage.get_operation_history(operation);
    }

    async get_operation(operation_id)
    {
        return this.storage.get_operation(operation_id);
    }

    async is_flow_completed(flow_id)
    {
        return this.storage.is_flow_completed(flow_id); 
    }

    async get_parent(operation)
    {
        return this.storage.get_parent(operation);
    }
    /** Return an array of active flow_id
     * 
     * @param {*} no_more 
     * @param {*} options 
     */
    async get_active_flows(no_more, options)
    {
        if(undefined === no_more)
        {
            no_more = 10;
        }

        if(undefined === options)
        {
            options = {};
        }

        return this.storage.get_active_flows(no_more, options);
    }

    async get_hierarchical_flow(flow_id)
    {
        return this.storage.get_hierarchical_flow(flow_id);
    }

    async get_storage_flow(flow_id)
    {
        return this.storage.get_storage_flow(flow_id);
    }
    /*
    async get_direct_dependents(operation)
    {

    }

    
    
    */

}

//const Operation = new OperationManager();
//const Flow = new flow_manager();

module.exports = {/*OperationManager,*/ flow_manager};