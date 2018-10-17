const EventEmitter = require('events');

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
                op_to_do = result;
                //nothing to do
                return;
            }
        }

        let op = op_to_do[0];

        op_to_do = op_to_do.slice(1);
            
        const system = await flow.type_is_system(op.type);

        if(system)
        {
            try{
                await flow.process_system_operation(op);
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

    op_to_do = result;
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

    async get_work(processor_name, processor_work_id)
    {
        await load_and_process_system(this.op_to_do, this.flow, this.configuration.op_batch);

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

        return {
            path : operation.external_type
            , config: operation.config
            , tag: operation.id
            , propertybag: operation.propertybag
        };

    }

    async processed(tag, successed, result, propertybag, processor_name, processor_work_id)
    {
        const operation = this.flow.get_operation(tag);

        const w = this.working.find(element => {return element.id = tag;});

        if(w.processor_name != processor_name ||
            w.processor_work_id != processor_work_id)
        {
            throw 'invalid processor';
        }

        if(!successed)
            this.flow.register_failure(operation, result);
        else
        {
            operation.propertybag = propertybag;
            this.flow.register_success(operation, result);
        }
    }

}


module.exports = Coordinator;