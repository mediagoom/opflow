const config       = require('./config');
const dbg          = require('debug')('opflow:wire');
const flow_manager = require('./operation').flow_manager;
const coordinator  = require('./coordinator');
const processor    = require('./processor');
const EventEmitter = require('events');

function initialize_all(wire, create_processor)
{
    if(null === wire.flow_manager)
    {
        dbg('create flow_manager', wire.configuration.storage);
        wire.flow_manager = new flow_manager(config.storage);

        if(undefined !== wire.configuration.storage.max_retry_interval_seconds 
            && 0 < wire.configuration.storage.max_retry_interval_seconds )
        {
            wire.flow_manager.max_retry_interval_seconds = wire.configuration.storage.max_retry_interval_seconds;
        }
    }

    if(null === wire.coordinator)
    {
        dbg('create coordinator', wire.configuration.coordinator);
        wire.coordinator = new coordinator(wire.flow_manager, wire.configuration.coordinator);

        wire.coordinator.on('end', (flow_id) => { wire.emit('end', flow_id); });
        wire.coordinator.on('suspend', (flow_id, operation_id) => { 
            wire.emit('suspend', flow_id, operation_id); 
        });
    }

    if(null === wire.processor && true === create_processor)
    {
        dbg('create processor', wire.configuration.processor);
        wire.processor = new processor(wire.coordinator, wire.configuration.processor);
    }
}

/**
 * 
 */
class Wire extends EventEmitter  {

    constructor()
    {
        super();
        this.configuration = { processor : {} , storage : {},  coordinator : {} };
        this.flow_manager = null;
        this.coordinator = null;
        this.processor = null;
    }
    /**
     * Start the processor
     */
    start(){

        if(null === this.processor)
        {
            initialize_all(this, true);
            this.processor.start();
            return true;
        }

        return false;
    }
    /**
     * Stop the processor
     */
    stop(){

        initialize_all(this);
        this.processor.stop();
        this.processor = null;

    }
    /**
     * Configure the processor before starting it.
     * @param {object} options {
     *  processor : {
     *        polling_interval_seconds : 30
            , active_operations : 2
            } 
        , storage : {
            path : <absolute path of the disk directory> where operations will be stored on disk for reliability
            }
        , coordinator : { op_batch : 3 } //how many operations are retrieved from storage together
     *  }
     *  
     */
    configure(options)
    {
        this.configuration = Object.assign({}, this.configuration, options);
    }
    /**
     * Submit a flow for processing
     * @param {object} flow 
     */
    async add_flow(flow)
    {
        initialize_all(this);

        const flow_id = await this.flow_manager.save_flow(flow);
        
        //make sure we start processing it right away
        if(null !== this.processor){
            await this.processor.poll();
        }

        return flow_id;
    }
    /**
     * Return a runtime flow. An array of operations;
     * @param {string} flow_id 
     * @returns {array} of operations
     */
    async get_runtime_flow(flow_id)
    {
        initialize_all(this);
        return this.flow_manager.get_storage_flow(flow_id);
    }
    /**
     * Return a flow object with state
     * @param {string} flow_id 
     */
    async get_flow(flow_id)
    {
        initialize_all(this);
        return this.flow_manager.get_hierarchical_flow(flow_id);
    }
    /**
     * Return true if a flow completed
     * @param {string} flow_id 
     */
    async is_flow_completed(flow_id)
    {
        initialize_all(this);
        return this.flow_manager.is_flow_completed(flow_id);
    }
}

module.exports = new Wire();