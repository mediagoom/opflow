const chai   = require('chai');
const opflow = require('../index');
const dbg    = require('debug')('opflow:wire-test');
const flows  = require('./flows');
const config = require('../config');

opflow.configure({storage : {max_retry_interval_seconds : 0.001}, processor : {polling_interval_seconds : 0.001 }});

const expect = chai.expect;


describe('WIRE', () => {

    after(() => {config.storage = null;});
    
    it('should start, run and then stop', async () => {
         
        const test_flow = JSON.parse(JSON.stringify(flows.simpleEcho));
        const error_flow = JSON.parse(JSON.stringify(flows.errorFlow));
       
        opflow.start();

        let event_end = false;
        let event_error = false;

        opflow.on('end', (flow_id)=>{ 
            dbg('opflow-end', flow_id);
            event_end = true; }
        );

        opflow.on('suspend', (flow_id)=>{ 
            dbg('opflow-error', flow_id);
            event_error = true; }
        );
        
        const err_id  = await opflow.add_flow(error_flow); 
        const flow_id = await opflow.add_flow(test_flow);
       

        dbg('processor-started', flow_id, err_id);

        while(! await opflow.is_flow_completed(flow_id) )
        {
            await opflow.util.Wait(10);
        }                    
       
        const already_running = !opflow.start();

        let count = 0;
        while(!event_end && 10 > count++)
            await opflow.util.Wait(10);

        expect(already_running).to.be.true;
        
        opflow.stop();
                            
        const operations = await opflow.get_runtime_flow(flow_id);

        dbg('found ', operations.length);

        expect(operations.length).to.be.greaterThan(0);

        const h = await opflow.get_flow(flow_id);

        expect(h.root.type).to.be.eq('START');

        expect(event_end).to.be.true;
        expect(event_error).to.be.eq(true, 'missing error event');

    });
});