/* global describe it */
const chai   = require('chai');
const config = require('../config');
//const dbg    = require('debug')('opflow:processor-test');
//const operation = require('../operation').OperationManager;
const flow  = require('../operation').FlowManager;
const flows = require('./flows');

const coordinator = require('../coordinator');

const expect = chai.expect;

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

describe('PROCESSOR',  () => {
        
    config.storage.reset();

    const testflows = {
        'simpleecho' : {
            'flow' : flows.simpleecho
            , 'userops' : 2
            , 'complete' : true 
        }
        , 'basicflow' : {
            'flow' : flows.basicflow
            , 'userops' : 0
            , 'complete' : true 
        }
    };

    const flowkey = Object.keys(testflows);

    for(let idx = 0; idx < flowkey.length; idx++)
    {
        const key = flowkey[idx];
        const testflow = testflows[key].flow;
        const userops = testflows[key].userops;
        const shouldend = testflows[key].complete;

        it('should process operation ' + key, async () => {

            const firstflow = JSON.parse(JSON.stringify(testflow)); 
            firstflow.name = key;
            const flowman = new flow(config.storage);
            const coord = new coordinator(flowman, {});
            const processor_name = 'test_processor';
            let processor_work_id = 0;

            const flowid = await flowman.save_flow(firstflow);

            let op = await coord.get_work(processor_name, processor_work_id);

            while(null != op)
            {
                const processor = require(op.path);

                const result = await processor.process(op.config, op.propertybag);
                
                await coord.processed(op.tag, true, result, op.propertybag, processor_name, processor_work_id);           

                op = await coord.get_work(processor_name, (++processor_work_id));
            }

            expect(processor_work_id).to.be.eq(userops, 'user operations to be completed');
            const completed = await flowman.is_flow_completed(flowid);
            expect(completed).to.be.eq(shouldend, 'flow should or shuld not complete');

        });

    }

});