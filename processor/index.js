const EventEmitter = require('events');
const os = require('os');

let idx = 0;

function computer_name()
{
    let cn = os.hostname();

    if(0 < idx)
    {
        cn = cn + '_' + idx++;
    }

    return cn;
}

const config_defaults = {
    polling_interval_seconds : 30
    , active_operations : 2
    , processor_name : computer_name()
};

class ProcessorBox {

    constructor(operation, idx, processor)
    {
        //super();

        this.operation = operation;
        this.executor = require(this.operation.path);
        this.promise = this.executor.process(this.operation.config, this.operation.propertybag);
        this.completed = false;
        this.err = null;
        this.result = null;
        this.succeeded = false;
        this.idx = idx;

        this.promise.then(result => {
            this.succeeded = this.completed = true; 
            this.result = result;
            let promise = processor.completed(); // eslint-disable-line no-unused-vars
        }
        ).catch( err => {
            this.completed = true;
            this.result = this.err = err;
            
            let promise = processor.completed(); // eslint-disable-line no-unused-vars
        });
    }
}

module.exports = class Processor extends EventEmitter{
    
    constructor(coordinator, configs)
    {
        super();

        this.configuration = Object.assign({}, config_defaults, configs);
        this.coordinator = coordinator;
        this.interval = null;
        this.running = [];
        this.idx = 0;

        if(!isNaN(this.configuration.polling_interval_seconds))
        {
            this.interval = setInterval(() => {
                let promise = this.poll(); // eslint-disable-line no-unused-vars
            }
            , (this.configuration.polling_interval_seconds * 1000));

            this.interval.unref(); //do not keep node running for this
        }

    }

    async completed()
    {
        let sliced = true;

        while(sliced)
        {
            sliced = false;

            for(let idx = 0; idx < this.running.length; idx++)
            {
                if(this.running[idx].completed)
                {
                    const box = this.running.splice(idx, 1)[0];
                    sliced = true;
                    
                    await this.coordinator.processed(box.operation.tag
                        , box.succeeded
                        , box.result
                        , box.operation.propertybag
                        , this.configuration.processor_name
                        , box.idx
                    );

                    break;
                    
                }
            }
        }

        await this.poll();

    }

    /**
     * Check if should get operations and execute them.
     * @returns {boolean} true if it did something, false otherwise
     */
    async poll()
    {
        let pushed = false;

        while(this.configuration.active_operations > this.running.length)
        {
            const idx = this.idx;
            const op = await this.coordinator.get_work(this.configuration.processor_name, idx);

            if(null == op)
                return pushed;

            this.idx++;

            this.running.push(new ProcessorBox(op, idx, this));
            pushed = true;
        }

        return pushed;
    }
    


};