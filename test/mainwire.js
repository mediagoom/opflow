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

        const flow_id = await opflow.add_flow(test_flow);

        opflow.start();

        dbg('processor-started');

        while(! await opflow.is_flow_completed(flow_id) )
        {
            await test.Wait(10);
        }                    
        
        opflow.stop();
                            
        const operations = await opflow.get_runtime_flow(flow_id);

        dbg('found ', operations.length);

        expect(operations.length).to.be.greaterThan(0);

        const h = await opflow.get_flow(flow_id);

        expect(h.root.type).to.be.eq('START');

    });
});