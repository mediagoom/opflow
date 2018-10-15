/* global describe it */
const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:test');
//const operation = require('../operation').OperationManager;
const flow  = require('../operation').FlowManager;
const flows = require('./flows');

const expect = chai.expect;

describe('OPFLOW',  () => {
    
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

                    operations = await flowman.load_operations(10);

                    expect(operations.length).to.be.eq(2);

                    

                    return;

                });

                it('should complete operations', async () => {

                    const flowman = new flow(config.storage);
                    let operations = await flowman.load_operations(10);

                    let complete = 0;

                    while(0 !== operations.length && complete < 10)
                    {
                        for(let idx = 0; idx < operations.length; idx++)
                        {
                            await flowman.complete_operation(operations[idx]);
                            complete++;
                        }

                        operations = await flowman.load_operations(10);
                    }

                    expect(complete).to.be.eq(8);

                });





            });

        }
    });
    

    describe('PROCESSOR',  () => {
        
        it('should process operation', async () => {
 
        });

    });

});