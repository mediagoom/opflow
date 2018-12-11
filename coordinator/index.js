const EventEmitter = require('events');
const dbg          = require('debug')('opflow:coordinator');
const assert       = require('assert');//.strict;
const createError  = require('../error');

/*
class coordinatorError extends Error
{
    constructor(msg)
    {
        super(msg);

    }
}
*/

const config_defaults = {
    op_batch : 3
    , error_recorder : console.error
};

function print_todo(ctx, op_to_do)
{
    
    let info = '';
    let join = '';

    if(op_to_do.length < 1)
    {
        info += ' NOT OP ';
    }

    op_to_do.forEach(el => { info += join + ' ' + el.id; join = ',';  });

    dbg(ctx, 'OP_TO_DO', info );
}

async function load_and_process_system(op_to_do, flow, batch)
{
    const result = new Array();

    dbg('load and process', op_to_do.length);

    while(result.length < batch)
    {
        if(0 === op_to_do.length)
        {
            dbg('loading from storage %d', (batch - result.length));
            op_to_do = await flow.load_operations(batch - result.length);
            if(0 === op_to_do.length)
            {
                //nothing to do
                dbg('no more from storage', result.length);
                return result;
            }
        }

        let op = op_to_do[0];

        let operation_parent = await flow.get_parent(op);

        if(undefined !== operation_parent)
        {
            if(Array.isArray(operation_parent))
            {
                assert('JOIN' === op.type, 'Parent array for not join ' + op.id);
                op.propertyBag = {};
            }
            else
            {
                operation_parent = await flow.get_operation(operation_parent);
                assert(operation_parent.completed && operation_parent.succeeded);

                op.propertyBag = operation_parent.propertyBag;
                op.propertyBag.parent = {};
                op.propertyBag.original = {};
                op.propertyBag.parent.result = operation_parent.result;
                op.propertyBag.parent.succeeded = operation_parent.succeeded;

                if(undefined !== op.propertyBag.config)
                {
                
                    let keys = Object.keys(op.propertyBag.config);
                
                    if(undefined !== op.config && null !== op.config)
                    {                
                        for(let idx = 0 ; idx < keys.length; idx++)
                        {
                            const key = keys[idx];
                            
                            dbg('config key replace %j', op.config, key);

                            const val = op.config[key]; 
                    
                            if(val !== undefined)
                            {                            
                                const original = val;
                                op.config[key] = op.propertyBag.config[key];
                                op.propertyBag.original[key] = original;
                            
                            }
                    
                        }
                    }
                }
                else
                {
                    op.propertyBag.config = {};
                }
            }
        }
        else
        {
            assert('START' === op.type, 'Missing Parent for not a START ' + op.id); 
        }

        op_to_do = op_to_do.slice(1);
            
        const system = await flow.type_is_system(op.type);

        if(system)
        {
            try{

                dbg('PROCESS SYSTEM OPERATION', op.id, op.type, op.name);
                const result = await flow.process_system_operation(op);
                await flow.register_success(op, result);

            }catch(e)
            {
                const msg = 'SYSTEM OPERATION FAILURE ' + e.message + ' ' + e.stack; 
                await flow.register_failure(op, msg);
                dbg(msg);
            }
        }
        else
        {
            op.external_type = await flow.get_type_path(op.type);
            dbg('loader push', op.id);
            result.push(op);
        }

    }

    return result;
}
/** coordinator coordinate the work of the processors */
class coordinator extends EventEmitter
{
    constructor(flow_manager, configs)
    {
        super();
        this.configuration = Object.assign({}, config_defaults, configs);
        this.flow          = flow_manager;

        this.op_to_do = [];
        this.working = [];

        this.loading = false;

        this.flow.on('end', (flow_id) => {this.emit('end', flow_id);});
        this.flow.on('suspend', (flow_id, operation_id) => {
            this.emit('suspend', flow_id, operation_id);
        });
    }

    async load_operations(ctx)
    {
        if(0 == this.op_to_do.length /*< this.configuration.op_batch*/ && (!this.loading))
        {
            this.loading = true;
            try{

                dbg(ctx, 'loading operations', this.op_to_do.length);
                const ops = await load_and_process_system(this.op_to_do, this.flow, this.configuration.op_batch);
                print_todo(ctx + ' load operations', ops);
                this.op_to_do = ops;
                this.loading = false;

            }catch(err)
            {
                dbg(ctx, 'load_operations err %s %s %j', err.message, err.stack, err);
                this.loading = false;
                throw err;
            }
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
            , propertyBag: <the operation flow propertyBag>
        };
     */
    async get_work(processor_name, processor_work_id)
    {
        try{
            
            await this.load_operations('get_work');

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

            print_todo('GET WORK', this.op_to_do);
            dbg('WORKING ON ', JSON.stringify(Object.assign({}, operation, {children: null, history: null}), null, 4));

            return {
                path : operation.external_type
                , config: operation.config
                , tag: operation.id
                , name: operation.name
                , propertyBag: JSON.parse(JSON.stringify(operation.propertyBag))
            };

        }catch(err)
        {
            this.configuration.error_recorder('COORDINATOR GET_WORK ERROR', err.message, err.stack);
            throw err;
        }
    }
    /**
     * Called by the processor to signal the completion successful or not of an operation
     * @param {*} tag 
     * @param {*} succeeded 
     * @param {*} result 
     * @param {*} propertyBag 
     * @param {*} processor_name 
     * @param {*} processor_work_id 
     */
    async processed(tag, succeeded, result, propertyBag, processor_name, processor_work_id)
    {
        try{
            const operation = await this.flow.get_operation(tag);

            const w = this.working.find(element => {return element.id === tag;});

            if(w.processor_name != processor_name ||
                w.processor_work_id != processor_work_id)
            {
                throw createError(0, 'invalid processor', 'coordinator_processed_Error', {});
            }

            operation.executed = true;

            dbg('COMPLETED ', tag, operation.name, succeeded, result);

            if(!succeeded)
                await this.flow.register_failure(operation, result);
            else
            {
                operation.propertyBag = propertyBag;
                await this.flow.register_success(operation, result);
            }

            await this.load_operations('processed');

        }catch(err)
        {
            this.configuration.error_recorder('COORDINATOR PROCESSED ERROR', err.message, err.stack);
            throw err;
        }
    }

    async get_hierarchical_flow(flow_id)
    {
        return this.flow.get_hierarchical_flow(flow_id); 
    }
}
module.exports = coordinator;