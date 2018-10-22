/* global describe it */
const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:storagetest');
//const operation = require('../operation').OperationManager;
const flow  = require('../operation').flow_manager;
const flows = require('./flows');

const storageError = require('../storage/storageError');

const expect = chai.expect;
    
describe('STORAGE',  () => {

    const storages = ['../storage/memory'
        //, '../storage/disk'
    ];

    for(let idx = 0; idx < storages.length; idx++)
    {    
        describe(storages[idx],  () => {    

            it('should change storage', () => {
                config.change_storage(storages[idx]);
            });

            it('should support save flow', async () => {
                
                const first_flow = JSON.parse(JSON.stringify(flows.basicFlow)); 
                const second_flow = JSON.parse(JSON.stringify(flows.simplejoin)); 

                //dbg('FLOW.1', JSON.stringify(flows, null, 4));

                expect(first_flow).to.have.property('root');
                    
                //dbg('STORAGE', config.data.storage);

                const storage = config.storage;

                //dbg('EVENTS', storage.events);
                
                const flow_manager= new flow(storage);

                const flow_id = await flow_manager.save_flow(first_flow);

                const ended = await flow_manager.is_flow_completed(flow_id);

                expect(ended).to.be.false;                

                let operations = await flow_manager.load_operations(10);

                expect(operations.length).to.be.eq(1);
                    
                await flow_manager.save_flow(second_flow);

                let operations1 = await flow_manager.load_operations(10);
                //lease time should prevent the first flow to return anything.
                expect(operations1.length).to.be.eq(1);
                    
                flow_manager.reset_operation(operations[0]);
                flow_manager.reset_operation(operations1[0]);

                operations = await flow_manager.load_operations(10);

                expect(operations.length).to.be.eq(2);
                    

                flow_manager.reset_operation(operations[0]);
                flow_manager.reset_operation(operations[1]);

                return;

            });

            it('should load and complete operations', async () => {

                const flow_manager= new flow(config.storage);
                let operations = await flow_manager.load_operations(10);

                let complete = 0;

                while(0 !== operations.length && complete < 10)
                {
                    for(let idx = 0; idx < operations.length; idx++)
                    {
                        await flow_manager.register_success(operations[idx], 'TEST NOT EXECUTION [' + idx.toString() + ']' );
                        complete++;
                            
                        const history = await flow_manager.get_operation_history(operations[idx]);

                        expect(history.length).to.be.eq(1); 

                    }

                    operations = await flow_manager.load_operations(10);
                }

                expect(complete).to.be.eq(8);

            });

            it('should register and delay error', async () => {

                const flow_manager= new flow(config.storage);
                const first_flow = JSON.parse(JSON.stringify(flows.basicFlow)); 

                await flow_manager.save_flow(first_flow);

                let operations = await flow_manager.load_operations(10);
                expect(operations.length).to.be.eq(1, 'loaded operations');

                let op = operations[0];
                   
                let j = 0;
                await flow_manager.register_failure(op, 'REGISTER FAILURE ' + (j++).toString());

                operations = await flow_manager.load_operations(10);
                expect(operations.length).to.be.eq(0, 'after failure asOf should be set');
                   
                while(null != op)
                {
                    dbg('reset asOf', op.id);
                    await flow_manager.set_operation_asOf(op);

                    operations = await flow_manager.load_operations(10);

                    if(0 < operations.length)
                    {
                        expect(op).to.eql(operations[0]);
                        await flow_manager.register_failure(operations[0], 'REGISTER FAILURE ' + (j++).toString());
                    }
                    else
                    {
                        const history = await flow_manager.get_operation_history(op);
                        dbg('Completed retries', JSON.stringify(history, null, 4));
                        op = null;
                    }
                }                    
                    
                expect(j).to.be.eq(3);
                
            });

            const keys = Object.keys(flows);

            for(let idx = 0; idx < keys.length; idx++)
            {

                it('should convert from storage to hierarchical ' + keys[idx], async () => {

                    const originalflow = flows[keys[idx]];

                    const first_flow = JSON.parse(JSON.stringify(originalflow));

                    const storage = config.storage;
                
                    const flat = storage.json_flow_to_storage_flow(first_flow);

                    dbg('FLAT', JSON.stringify(flat, null, 4));

                    const hierarchical = storage.storage_flow_to_json_flow(flat.operations);
                
                    dbg('FLOW', JSON.stringify(hierarchical, null, 4));

                    expect(hierarchical).to.be.eql(originalflow, 'The original flow and the storage => hirarchical differ');

                });

            }
        });

    }

    describe('handle broken flow descriptor', () => {

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

