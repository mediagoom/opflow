/* global describe it */
const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:storagetest');
//const operation = require('../operation').OperationManager;
const flow  = require('../operation').FlowManager;
const flows = require('./flows');

const storageError = require('../storage/storageError');

const expect = chai.expect;


    
describe('STORAGE',  () => {

    const storages = ['../storage/memory'];

    for(let idx = 0; idx < storages.length; idx++)
    {    
        describe(storages[idx],  () => {    

            config.storage.reset();

            it('should support save flow', async () => {

                const firstflow = JSON.parse(JSON.stringify(flows.basicflow)); 
                const secondflow = JSON.parse(JSON.stringify(flows.simplejoin)); 

                //dbg('FLOW.1', JSON.stringify(flows, null, 4));

                expect(firstflow).to.have.property('root');
                    
                //dbg('STORAGE', config.data.storage);

                const storage = config.storage;

                //dbg('EVENTS', storage.events);
                
                const flowman = new flow(storage);

                await flowman.save_flow(firstflow);

                let operations = await flowman.load_operations(10);

                expect(operations.length).to.be.eq(1);
                    
                await flowman.save_flow(secondflow);

                let operations1 = await flowman.load_operations(10);
                //lease time should prevent the first flow to return anything.
                expect(operations1.length).to.be.eq(1);
                    
                flowman.reset_operation(operations[0]);
                flowman.reset_operation(operations1[0]);

                operations = await flowman.load_operations(10);

                expect(operations.length).to.be.eq(2);
                    

                flowman.reset_operation(operations[0]);
                flowman.reset_operation(operations[1]);

                return;

            });

            it('should load and complete operations', async () => {

                const flowman = new flow(config.storage);
                let operations = await flowman.load_operations(10);

                let complete = 0;

                while(0 !== operations.length && complete < 10)
                {
                    for(let idx = 0; idx < operations.length; idx++)
                    {
                        await flowman.register_success(operations[idx], 'TEST NOT EXECUTION [' + idx.toString() + ']' );
                        complete++;
                            
                        const history = await flowman.get_operation_history(operations[idx]);

                        expect(history.length).to.be.eq(1); 

                    }

                    operations = await flowman.load_operations(10);
                }

                expect(complete).to.be.eq(8);

            });

            it('should register and delay error', async () => {

                const flowman = new flow(config.storage);
                const firstflow = JSON.parse(JSON.stringify(flows.basicflow)); 

                await flowman.save_flow(firstflow);

                let operations = await flowman.load_operations(10);
                expect(operations.length).to.be.eq(1);

                let op = operations[0];
                   
                let j = 0;
                await flowman.register_failure(op, 'REGISTER FAILURE ' + (j++).toString());

                operations = await flowman.load_operations(10);
                expect(operations.length).to.be.eq(0, 'after failure asof should be set');
                   
                while(null != op)
                {
                    await flowman.set_operation_asof(op);

                    operations = await flowman.load_operations(10);

                    if(0 < operations.length)
                    {
                        expect(op).to.eql(operations[0]);
                        await flowman.register_failure(operations[0], 'REGISTER FAILURE ' + (j++).toString());
                    }
                    else
                    {
                        const history = await flowman.get_operation_history(op);
                        dbg('Completed retries', JSON.stringify(history, null, 4));
                        op = null;
                    }
                }                    
                    
                expect(j).to.be.eq(3);
                
            });
        });

    }

    describe('HANDLE BROKEN FLOW DESCRIPTOR', () => {

        const brokenflows = require('./broken');

        for(let idx = 0; idx < brokenflows.broken.length; idx++)
        {
            it(brokenflows.broken[idx].case, () => {

                let broken = false;
                try{
                    config.storage.json_flow_to_storage_flow(brokenflows.broken[idx].flow);
                }catch(e)
                {
                    expect(e).to.be.an.instanceof(storageError);
                    dbg(e.message, e.stack);
                    broken = true;
                }

                expect(broken).to.be.true;

            });
        }

    });

});

