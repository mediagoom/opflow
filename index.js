const config      = require('./config');
const dbg         = require('debug')('opflow:wire');
const flow_manager = require('./operation').flow_manager;
const coordinator = require('./coordinator');
const processor   = require('./processor');

function initialize_all(wire)
{
    if(null === wire.flow_manager)
    {
        dbg('create flow_manager', wire.configuration.storage);
        wire.flow_manager = new flow_manager(config.storage);
    }

    if(null === wire.coordinator)
    {
        dbg('create coordinator', wire.configuration.coordinator);
        wire.coordinator = new coordinator(wire.flow_manager, wire.configuration.coordinator);
    }

    if(null === wire.processor)
    {
        dbg('create processor', wire.configuration.processor);
        wire.processor = new processor(wire.coordinator, wire.configuration.processor);
    }
}

class Wire  {

    constructor()
    {
        this.configuration = { processor : {} , storage : {},  coordinator : {} };
        this.flow_manager = null;
        this.coordinator = null;
        this.processor = null;
    }
    /**
     * Start the processor
     */
    start(){
        initialize_all(this);
        this.processor.start();
    }
    /**
     * Stop the processor
     */
    stop(){
        initialize_all(this);
        this.processor.stop();
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
        return this.flow_manager.save_flow(flow);
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