/* global describe it after*/
const chai   = require('chai');
const opflow = require('../index');
const dbg    = require('debug')('opflow:wire-test');
const flows  = require('./flows');
const config = require('../config');

const expect = chai.expect;

function Wait(ms)
{
    return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
        setTimeout(()=> {resolve();}, ms);
    });
}

describe('WIRE', () => {

    after(() => {config.storage = null;});
/*
    it('should start, run and then stop X', (done) => {
         
        const test_flow = JSON.parse(JSON.stringify(flows.simpleEcho));

        opflow.configure({processor : {polling_interval_seconds : 0.001}});

        opflow.add_flow(test_flow).then(
            (flow_id) => {

                opflow.start();

                //expect(proc.interval).to.be.not.null;

                dbg('processor-started');

                setTimeout(()=>{
                    
                    dbg('processor-check-run');

                    opflow.is_flow_completed(flow_id).then(
                        (val) => {
                            
                            opflow.stop();
                            
                            expect(val).to.be.true;
                            
                            done();

                        }
                    ).catch(
                        (err) => {
                            dbg('should run ERROR %s %j', err.message, err);
                            done(err);
                        }
                    );
            
                }, 250);
            }
        ).catch(
            (err) => {done(err);}
        );

    });
*/
    it('should start, run and then stop', async () => {
         
        const test_flow = JSON.parse(JSON.stringify(flows.simpleEcho));

        opflow.configure({processor : {polling_interval_seconds : 0.001}});

        const flow_id = await opflow.add_flow(test_flow);

        opflow.start();

        dbg('processor-started');

        while(! await opflow.is_flow_completed(flow_id) )
        {
            await Wait(10);
        }                    
        
        opflow.stop();
                            
        const operations = await opflow.get_runtime_flow(flow_id);

        dbg('found ', operations.length);

        expect(operations.length).to.be.greaterThan(0);

        const h = await opflow.get_flow(flow_id);

        expect(h.root.type).to.be.eq('START');

    });
});