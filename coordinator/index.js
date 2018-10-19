const EventEmitter = require('events');
const dbg    = require('debug')('opflow:processor');

class coordinatorError extends Error
{
    constructor(msg)
    {
        super(msg);

    }
}

const config_defaults = {
    op_batch : 3
};

async function load_and_process_system(op_to_do, flow, batch)
{
    const result = new Array();

    while(result.length < batch)
    {
        if(0 === op_to_do.length)
        {
            op_to_do = await flow.load_operations(batch);
            if(0 === op_to_do.length)
            {
                //nothing to do
                return result;
            }
        }

        let op = op_to_do[0];

        let opparent = await flow.get_parent(op);

        if(undefined !== opparent)
        {
            if(Array.isArray(opparent))
            {
                if('JOIN' !== op.type)
                {
                    throw new coordinatorError('Parent array for not join ' + op.id);
                } 

                op.propertybag = {};
            }
            else
            {
                opparent = await flow.get_operation(opparent);
                op.propertybag = opparent.propertybag;
            }
        }
        else
        {
            if('START' !== op.type)
            {
                throw new coordinatorError('Missing Parent for not a START ' + op.id); 
            }
        }

        op_to_do = op_to_do.slice(1);
            
        const system = await flow.type_is_system(op.type);

        if(system)
        {
            try{
                const result = await flow.process_system_operation(op);
                await flow.register_success(op, result);

            }catch(e)
            {
                await flow.register_failure(op, 'SYSTEM OPERATION FAILURE ' + e.message + ' ' + e.stack);
            }
        }
        else
        {
            op.external_type = await flow.get_type_path(op.type);
            result.push(op);
        }

    }

    return result;
}
/** Coordinator coordinate the work of the processors */
class Coordinator extends EventEmitter
{
    constructor(FlowManager, configs)
    {
        super();
        this.configuration = Object.assign({}, config_defaults, configs);
        this.flow          = FlowManager;

        this.op_to_do = [];
        this.working = [];
    }

    async loadops()
    {
        if(this.op_to_do.length < this.configuration.op_batch)
        {
            this.op_to_do = await load_and_process_system(this.op_to_do, this.flow, this.configuration.op_batch);
        }
    }
    /**
     * Called by processor to get the work to be done.
     * @param {string} processor_name the name of the processor
     * @param {string} processor_work_id the identifier of this operation as will be processed by the processor
     * @returns {object} {
            path : <the require path of the operation>
            , config: <the operation configuration>
            , tag: <the operation opaque identifier>
            , propertybag: <the operation flow propertybag>
        };
     */
    async get_work(processor_name, processor_work_id)
    {
        await this.loadops();

        if(0 === this.op_to_do.length)
        {
            //nothing todo
            return null;    
        }        

        const operation = this.op_to_do[0];
        this.op_to_do = this.op_to_do.slice(1);

        operation.processor_name = processor_name;
        operation.processor_work_id = processor_work_id;

        this.working.push(operation);

        dbg('WORKING ON ', JSON.stringify(Object.assign({}, operation, {children: null, history: null}), null, 4));

        return {
            path : operation.external_type
            , config: operation.config
            , tag: operation.id
            , propertybag: JSON.parse(JSON.stringify(operation.propertybag))
        };

    }
    /**
     * Called by the processor to signal the compleation successful or not of an operation
     * @param {*} tag 
     * @param {*} succeeded 
     * @param {*} result 
     * @param {*} propertybag 
     * @param {*} processor_name 
     * @param {*} processor_work_id 
     */
    async processed(tag, succeeded, result, propertybag, processor_name, processor_work_id)
    {
        const operation = await this.flow.get_operation(tag);

        const w = this.working.find(element => {return element.id === tag;});

        if(w.processor_name != processor_name ||
            w.processor_work_id != processor_work_id)
        {
            throw 'invalid processor';
        }

        operation.executed = true;

        if(!succeeded)
            await this.flow.register_failure(operation, result);
        else
        {
            operation.propertybag = propertybag;
            await this.flow.register_success(operation, result);
        }

        await this.loadops();
    }

    async get_hierarchical_flow(flowid)
    {
        return this.flow.get_hierarchical_flow(flowid); 
    }
}


module.exports = Coordinator;