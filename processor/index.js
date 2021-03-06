const EventEmitter = require('events');
const os = require('os');
const dbg    = require('debug')('opflow:processor');
const assert       = require('assert');//.strict;

const createError = require('../error');

let idx = 0;

function computer_name()
{
    let cn = os.hostname();

    if(0 < idx)
    {
        cn = cn + '_' + idx;
    }

    idx = idx + 1;
    return cn;
}

const config_defaults = {
    polling_interval_seconds : 30
    , active_operations : 2
    , processor_name : null 
    , err_logger : console.error
};

function poll(processor)
{
    processor.poll()
        .then((polled)=>{dbg('polled', polled, processor.queue_size(), new Date());})
        .catch((e)=>{dbg('polled error', e.message, e.stack);});
}

class ProcessorBox {

    constructor(operation, idx, processor)
    {
        //super();

        this.operation = operation;
        this.executor = require(this.operation.path);
        this.promise = this.executor.process(this.operation.config, this.operation.propertyBag);
        this.completed = false;
        this.err = null;
        this.result = null;
        this.succeeded = false;
        this.idx = idx;
        
        this.completed_promise = null;

        this.promise.then(result => {
            this.succeeded = this.completed = true; 
            this.result = result;

            this.completed_promise = processor.completed(operation.tag); 
        }
        ).catch( err => {
            this.completed = true;
            this.err = err;

            let stack = '---';

            if(err.stack != null)
                stack = err.stack.toString();

            this.result = createError(err.status, err.message, typeof err, {stack});
            
            this.completed_promise = processor.completed(operation.tag); 
        });
    }
}

module.exports = class Processor extends EventEmitter{
    
    constructor(coordinator, configs)
    {
        super();

        this.configuration = Object.assign({}, config_defaults, configs);
        if(null == this.configuration.processor_name)
        {
            this.configuration.processor_name = computer_name();
        }
        this.coordinator = coordinator;
        this.interval = null;
        this.running = {};
        this.idx = 0;
        this.completed_count = 0;

    }

    async completed(tag)
    {
        const box = this.running[tag];
        
        assert(box.completed,'Invalid Completed tag ' + tag);
                            
        dbg('OPERATION COMPLETED', box.operation.tag, box.succeeded, '[', box.operation.name, ']', Object.keys(this.running));
                    
        await this.coordinator.processed(box.operation.tag
            , box.succeeded
            , box.result
            , box.operation.propertyBag
            , this.configuration.processor_name
            , box.idx
        );

        //let poll right now
        setImmediate(()=>{poll(this);});
        
        //await this.poll();

        delete this.running[tag];

        this.completed_count++;
    }

    queue_size()
    {
        return Object.keys(this.running).length; 
    }
    /**
     * Check if should get operations and execute them.
     * @returns {boolean} true if it did something, false otherwise
     */
    async poll()
    {
        let pushed = false;

        try{

            while(this.configuration.active_operations > this.queue_size())
            {
                const idx = this.idx;
                const op = await this.coordinator.get_work(this.configuration.processor_name, idx);

                if(null == op)
                    return pushed;
                
                dbg('RUNNING OPERATION ', op.tag, '[', op.name, ']'
                    , this.configuration.active_operations
                    , this.queue_size()
                    , Object.keys(this.running));
                    
                this.running[op.tag] = new ProcessorBox(op, idx, this);
                pushed = true;

                this.idx++;
            }

        }catch(err)
        {
            this.configuration.err_logger('PROCESSOR POLL ERROR', err.message, err.stack);
            throw err;
        }

        return pushed;
    }    

    async empty()
    {
        const keys = Object.keys(this.running);

        const promises = [];

        keys.forEach(element => {
            promises.push(this.running[element].completed_promise);  
        });

        return Promise.all(promises);
    }

    start()
    {
        
        if(!isNaN(this.configuration.polling_interval_seconds))
        {
            this.interval = setInterval(() => {
                poll(this);
            }
            , (this.configuration.polling_interval_seconds * 1000));

            dbg('processor start');

            this.interval.unref(); //do not keep node running for this
        }
        else
        {
            throw new Error('invalid configuration polling_interval_seconds');
        }
    }

    stop()
    {
        if(null !== this.interval)
            clearInterval(this.interval);
        this.interval = null;
    }
    


};