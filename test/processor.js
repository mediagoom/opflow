/* global describe it */
const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:processor-test');
//const operation = require('../operation').OperationManager;
const flow  = require('../operation').FlowManager;
const flows = require('./flows');

const coordinator = require('../coordinator');

const expect = chai.expect;

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('PROCESSOR',  () => {
        
    config.storage.reset();

    const testflows = {
        'basiccode' : {
            'flow' : flows.basiccode
            , 'userops' : 4
            , 'complete' : true 
        }
        , 'simpleecho' : {
            'flow' : flows.simpleecho
            , 'userops' : 4
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

        it('should process operation and forward propertybag [' + key + ']', async () => {

            const firstflow = JSON.parse(JSON.stringify(testflow)); 
            firstflow.name = key;
            const flowman = new flow(config.storage);
            const coord = new coordinator(flowman, {});
            const processor_name = 'test_processor';
            let processor_work_id = 0;
            const propertybag_checker = 'ahdodnthedhgaerehgfoaf';
            const flowid = await flowman.save_flow(firstflow);

            let op = await coord.get_work(processor_name, processor_work_id);
            if(null != op){
                expect(op.propertybag).to.not.have.property('propertybag_checker');
                op.propertybag.propertybag_checker = propertybag_checker;
            }

            while(null != op)
            {
                dbg('propertybag', op.id, JSON.stringify(op.propertybag.propertybag, null, 4));
                expect(op.propertybag).to.have.property('propertybag_checker');
                expect(op.propertybag.propertybag_checker).to.be.eq(propertybag_checker);
                const processor = require(op.path);

                const result = await processor.process(op.config, op.propertybag);
                
                await coord.processed(op.tag, true, result, op.propertybag, processor_name, processor_work_id);           

                op = await coord.get_work(processor_name, (++processor_work_id));
            }

            expect(processor_work_id).to.be.eq(userops, 'user operations to be completed');
            const completed = await flowman.is_flow_completed(flowid);
            expect(completed).to.be.eq(shouldend, 'flow should or shuld not complete');

            const jsonflow = await flowman.get_hierarchical_flow(flowid);

            dbg('COMPLEATED FLOW ', JSON.stringify(jsonflow, null, 4));
        });

    }

});