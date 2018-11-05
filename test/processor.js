const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:processor-test');
const flow  = require('../operation').flow_manager;
const flows = require('./flows');
const test  = require('./test-util');
const coordinator = require('../coordinator');
const processor = require('../processor');

const expect = chai.expect;

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('PROCESSOR', () => {

    //console.log('PROCESSOR TEST', process.env.DEBUG);

    const test_flows = {
        'basicCode' : {
            'flow' : flows.basicCode
            , 'user_operations' : 5 
            , 'complete' : true 
        }
        , 'simpleEcho' : {
            'flow' : flows.simpleEcho
            , 'user_operations' : 4
            , 'complete' : true 
        }
        , 'basicFlow' : {
            'flow' : flows.basicFlow
            , 'user_operations' : 0
            , 'complete' : true 
        }
    };

    const flow_manager    = new flow(config.storage);
    flow_manager.max_retry_interval_seconds = 0.3;
    
    const obj_coordinator = new coordinator(flow_manager, {});
    const processor_name  = 'test_processor';

    const flow_key = Object.keys(test_flows);

    for(let idx = 0; idx < flow_key.length; idx++)
    {
        const key = flow_key[idx];
        const test_flow = test_flows[key].flow;
        const user_operations = test_flows[key].user_operations;
        const should_end = test_flows[key].complete;

        
        let processor_work_id = 0;

        it('should process operation and forward propertyBag [' + key + ']', async () => {
            
            const storage = config.storage;
            await storage.reset(true);

            const first_flow = JSON.parse(JSON.stringify(test_flow)); 
            const flow_id = await flow_manager.save_flow(first_flow);
            
            const propertyBag_checker = 'obj_coordinator_long_string';
            
            let op = await obj_coordinator.get_work(processor_name, processor_work_id);
            if(null != op){
                expect(op.propertyBag).to.not.have.property('propertyBag_checker');
                op.propertyBag.propertyBag_checker = propertyBag_checker;

                expect(op).to.have.property('tag');
            }

            

            while(null != op)
            {
                dbg('propertyBag', op.tag, JSON.stringify(op.propertyBag, null, 4));
                expect(op.propertyBag).to.have.property('propertyBag_checker');
                expect(op.propertyBag.propertyBag_checker).to.be.eq(propertyBag_checker);
                const processor = require(op.path);

                let succeeded = false;
                let result = null;
                try{
                    result = await processor.process(op.config, op.propertyBag);
                    succeeded = true;
                }
                catch (err){
                    result = err;
                    dbg('Operation Failed %s %j', op.tag, result.message);
                }
                
                await obj_coordinator.processed(op.tag, succeeded, result, op.propertyBag, processor_name, processor_work_id);           

                op = await obj_coordinator.get_work(processor_name, (++processor_work_id));
            }

            const json_flow = await flow_manager.get_hierarchical_flow(flow_id);

            expect(json_flow).not.to.be.undefined;

            dbg('COMPLETED FLOW ', JSON.stringify(json_flow, null, 4));

            expect(processor_work_id).to.be.eq(user_operations, 'user operations to be completed');
            const completed = await flow_manager.is_flow_completed(flow_id);
            expect(completed).to.be.eq(should_end, 'flow should or should not complete');


        });
        
        it('should process operation using the class [' + key + ']', async () => {

            const first_flow = JSON.parse(JSON.stringify(test_flow)); 
            const flow_id = await flow_manager.save_flow(first_flow);
            const proc = new processor(obj_coordinator, {polling_interval_seconds : 'disabled'});
            let timed_out = false;
            const start = new Date();
            

            while((!timed_out) && proc.completed_count < user_operations)
            {
                await proc.poll();
                await proc.empty();

                const time = new Date();
                if(500 < (time.getTime() - start.getTime()))
                {
                    timed_out = true;
                }
            }

            

            dbg('polled', proc.queue_size(), proc.idx);//, Object.keys(proc.working));//, process._getActiveHandles(), process._getActiveRequests());

            await obj_coordinator.get_work(processor_name, (++processor_work_id));

            const json_flow = await flow_manager.get_hierarchical_flow(flow_id);

            dbg('COMPLETED FLOW.1 ', JSON.stringify(json_flow, null, 4));

            const completed = await flow_manager.is_flow_completed(flow_id);
            
            expect(timed_out).to.be.eq(false, 'the operation timed out');
            expect(completed).to.be.eq(should_end, 'check flow should or should not complete');
            
        
        });
        
        
    }

    it('should generate processor_name', () => {
        const processor1 = new processor(obj_coordinator);
        const processor2 = new processor(obj_coordinator);

        expect(processor2.configuration.processor_name).to.be.not.eq(processor1.configuration.processor_name);
    });

    
    it('should start and then stop', async () => {
            
        const proc = new processor(obj_coordinator, {polling_interval_seconds: 0.001});
        const test_flow = JSON.parse(JSON.stringify(test_flows.simpleEcho.flow));

        const flow_id = await flow_manager.save_flow(test_flow);

        proc.start();

        expect(proc.interval).to.be.not.null;
        dbg('processor-started');

        while (! await flow_manager.is_flow_completed(flow_id))
        {
            dbg('processor-check-run');

            await test.Wait(10);
            
        }

        proc.stop();
        
        
    });

});