const chai   = require('chai');
const opflow = require('../index');
const dbg    = require('debug')('opflow:wire-test');
const flows  = require('./flows');
const config = require('../config');
const test   = require('./test-util');

const expect = chai.expect;


describe('WIRE', () => {

    after(() => {config.storage = null;});
    
    it('should start, run and then stop', async () => {
         
        const test_flow = JSON.parse(JSON.stringify(flows.simpleEcho));

        opflow.configure({processor : {polling_interval_seconds : 0.001}});

        opflow.start();

        let event_end = false;

        opflow.on('end', (flow_id)=>{ 
            dbg('opflow-end', flow_id);
            event_end = true; }
        );
        
        const flow_id = await opflow.add_flow(test_flow);


        dbg('processor-started', flow_id);

        while(! await opflow.is_flow_completed(flow_id) )
        {
            await test.Wait(10);
        }                    
       
        const already_running = !opflow.start();

        let count = 0;
        while(!event_end && 10 > count++)
            await test.Wait(10);

        expect(already_running).to.be.true;
        
        opflow.stop();
                            
        const operations = await opflow.get_runtime_flow(flow_id);

        dbg('found ', operations.length);

        expect(operations.length).to.be.greaterThan(0);

        const h = await opflow.get_flow(flow_id);

        expect(h.root.type).to.be.eq('START');

        expect(event_end).to.be.true

    });
});