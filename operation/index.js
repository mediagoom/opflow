//const dbg    = require('debug')('opflow:operations');

/**  */
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
        
        return type.process(operation.config, operation.propertybag, operation, this);
    }

    async register_failure(operation, message)
    {
        operation.result = message;
        
        const type = await this.storage.get_type(operation.type);

        await this.storage.add_history(operation, message, false);

        const previus_failures = await this.storage.get_operation_failures_count(operation);

        if(type.retries <= previus_failures)
        {
            await this.storage.complete_operation(operation, false);
        }
        else
        {
            const type = await this.storage.get_type(operation.type);
            let time = new Date();
            time.setSeconds(time.getSeconds() + type.retries_interval);
            await this.storage.set_operation_asof(operation, time);
        }
    }

    async register_success(operation, message)
    {
        operation.result = message;
        
        await this.storage.add_history(operation, message, true);
        return this.storage.complete_operation(operation, true);
    }

    async reset_operation(operation)
    {
        return this.storage.reset_op(operation);
    }

    async set_operation_asof(operation, asof)
    {
        if(undefined === asof || null === asof)
        {
            asof = new Date();
        }
        return this.storage.set_operation_asof(operation, asof); 
    }

    async get_operation_history(operation)
    {
        return this.storage.get_operation_history(operation);
    }

    async get_operation(operationid)
    {
        return this.storage.get_operation(operationid);
    }

    async is_flow_completed(flowid)
    {
        return this.storage.is_flow_completed(flowid); 
    }

    async get_parent(operation)
    {
        return this.storage.get_parent(operation);
    }

    async get_hierarchical_flow(flowid)
    {
        return this.storage.get_hierarchical_flow(flowid);
    }

    async get_storage_flow(flowid)
    {
        return this.storage.get_storage_flow(flowid);
    }
    /*
    async get_direct_dependents(operation)
    {

    }

    
    
    */

}

//const Operation = new OperationManager();
//const Flow = new FlowManager();

module.exports = {/*OperationManager,*/ FlowManager};