/* global describe it */
const chai   = require('chai');
const opflow = require('../index');
const dbg    = require('debug')('opflow:wire-test');
const flows = require('./flows');


const expect = chai.expect;

describe('WIRE', () => {

    it('should start, run and then stop', (done) => {
        
        
        
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
});