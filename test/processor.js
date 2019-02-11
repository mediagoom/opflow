const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:processor-test');
const flow  = require('../operation').flow_manager;
const flows = require('./flows');
const test  = require('../util');
const coordinator = require('../coordinator');
const processor = require('../processor');
const Wait = require('../util').Wait;

const expect = chai.expect;

process.on('unhandledRejection', (reason, p) => {
    console.log('PROCESSOR TEST', 'Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const err_msg = 'fake coordinator';

const fake_operation = {
    path : '../operation/user/error'
    , config : {} 
    , propertyBag : {}
    , tag : 'tag'
};

class FakeCoordinator
{
    constructor(op)
    {
        this.op = op;
        this.count = 0;
        this.result = undefined;
    }

    async get_work()
    {
        if(undefined === this.op)
            throw new Error(err_msg);

        if(this.count++ > 0)
            return null;
        
        return this.op;
    }

    async processed(tag, succeeded, result, propertyBag, processor_name, processor_work_id)
    {
        dbg('processed', tag, succeeded, propertyBag, processor_name, processor_work_id);
        this.result = result;
    }
}

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
        , 'errorFlow' : {
            'flow' : flows.errorFlow
            , 'user_operations' : 1
            , 'complete' : false
        }
    };


    
    let flow_manager = null;

    beforeEach(() => {
        flow_manager    = new flow(config.storage);
        flow_manager.max_retry_interval_seconds = 0.3;
    });
    
    
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

            const flows = await flow_manager.get_active_flows();

            expect(flows.length).to.be.eq(0, 'invalid active flows');

            const obj_coordinator = new coordinator(flow_manager, {});

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

            //dbg('COMPLETED FLOW ', JSON.stringify(json_flow, null, 4));

            expect(processor_work_id).to.be.eq(user_operations, 'user operations to be completed');
            const completed = await flow_manager.is_flow_completed(flow_id);
            dbg('COMPLETED FLOW', flow_id, completed, should_end);
            expect(completed).to.be.eq(should_end, 'flow should or should not complete');


        });
        
        it('should process operation using the class [' + key + ']', async function() {

            const storage = config.storage;
            await storage.reset(true);

            const timeout = 800;

            this.timeout(timeout + 1000);

            const obj_coordinator = new coordinator(flow_manager, {});

            const first_flow = JSON.parse(JSON.stringify(test_flow)); 
            const flow_id = await flow_manager.save_flow(first_flow);
            const proc = new processor(obj_coordinator, {polling_interval_seconds : 'disabled'});
            let timed_out = false;
            const start = new Date();
            

            while((!timed_out) && proc.completed_count < user_operations)
            {
                const working = await proc.poll();
                if(0 < proc.queue_size())
                    await proc.empty();
                else
                    await Wait(5);

                const time = new Date();
                const ms = time.getTime() - start.getTime();
                if(timeout < ms)
                {
                    timed_out = true;
                }

                dbg('process-polled', working, proc.queue_size(), ms);
            }

            expect(timed_out).to.be.eq(false, 'the operation timed out'); 

            dbg('polled', proc.queue_size(), proc.idx);//, Object.keys(proc.working));//, process._getActiveHandles(), process._getActiveRequests());

            while((!timed_out) && obj_coordinator.loading)
            {
                await Wait(5);            
                const time = new Date();
                if(timeout < (time.getTime() - start.getTime()))
                {
                    timed_out = true;
                }
            }

            expect(timed_out).to.be.eq(false, 'the operation timed out loading');

            const work = await obj_coordinator.get_work(processor_name, (++processor_work_id));

            expect(work).to.be.null;

            dbg('checked-work', flow_id);

            const json_flow = await flow_manager.get_hierarchical_flow(flow_id);

            expect(json_flow).to.have.property('root');

            //dbg('COMPLETED FLOW.1 ', JSON.stringify(json_flow, null, 4));

            const completed = await flow_manager.is_flow_completed(flow_id);

            dbg('COMPLETED FLOW CLASS', flow_id, timed_out, completed, should_end);
            
            expect(completed).to.be.eq(should_end, 'check flow should or should not complete');
            
        
        });
        
        
    }

    it('should generate processor_name', () => {
        const obj_coordinator = new coordinator(flow_manager, {});

        const processor1 = new processor(obj_coordinator);
        const processor2 = new processor(obj_coordinator);

        expect(processor2.configuration.processor_name).to.be.not.eq(processor1.configuration.processor_name);
    });

    
    it('should start and then stop', async () => {
        
        const obj_coordinator = new coordinator(flow_manager, {});

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

    it('should use configured name', async ()=>{
        
        const config = {processor_name: 'custom_name', err_logger: (m) => {dbg(m);}};

        const proc = new processor(new FakeCoordinator(), config);
        let msg = '-';

        try{
            await proc.poll();
        }catch(e)
        {
            msg = e.message;
        }


        expect(msg).to.be.eq(err_msg);

    });

    it('should validate pooling time',  () =>{ 
        

        const config = {polling_interval_seconds: 'invalid configuration polling_interval_seconds'};

        const proc = new processor(new FakeCoordinator(), config);
        let msg = '-';

        try{
            proc.start();
        }catch(e)
        {
            msg = e.message;
        }

        expect(msg).to.be.eq(config.polling_interval_seconds);
    });

    it('should handle poll error',  async () =>{ 
        
        let msg = '-';

        const config = {polling_interval_seconds: 0.0001
            , err_logger: function(m)
            {
                //console.log(m);
                msg = m;
            }
        };

        const proc = new processor(new FakeCoordinator(), config);

        proc.start();

        const max = 20;
        let cnt = 1;
        
        while(msg === '-' && cnt++ < max )
        {
            await test.Wait(3);
        }

        dbg('waited for cnt:', cnt);

        proc.stop();
        proc.stop();

        expect(msg).to.be.eq('PROCESSOR POLL ERROR');
    });

    it('should handle operation error',  async () =>{ 
        
        const config = {polling_interval_seconds: 0.0001};

        const coordinator = new FakeCoordinator(fake_operation);
        const proc = new processor(coordinator, config);

        proc.start();

        const max = 20;
        let cnt = 1;
        
        while(coordinator.result === undefined && cnt++ < max )
        {
            await test.Wait(3);
        }

        dbg('waited for cnt:', cnt);

        proc.stop();

        expect(coordinator.result).to.not.be.an('undefined');
        expect(coordinator.result.stack).to.match(/user error operation/);
    });

});