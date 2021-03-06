/* global describe it */
const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:storage-test');
//const operation = require('../operation').OperationManager;
const flow  = require('../operation').flow_manager;
const flows = require('./flows');

const storageError = require('../storage/storageError');

const expect = chai.expect;
    
describe('STORAGE',  () => {

    //after(async () => {await config.storage.reset(true);});
    //beforeEach(async () => {await config.storage.reset(true);});

    const storages = ['../storage/memory'
        , '../storage/disk'
    ];

    for(let idx = 0; idx < storages.length; idx++)
    {    
        describe('test ' + storages[idx],  () => {    

            it('should change storage', async () => {
                await config.change_storage(storages[idx]);
                dbg('storage reset');
                await config.storage.reset(true);

                const flows = await config.storage.get_active_flows(10, {});
                dbg('active flows', flows);
                expect(flows.length).to.be.eq(0, 'active flows');
            });

            it('should support save flow', async () => {
                
                const first_flow = JSON.parse(JSON.stringify(flows.basicFlow)); 
                const second_flow = JSON.parse(JSON.stringify(flows.simpleJoin)); 

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

                const operations_batch = 2;
                const flow_manager= new flow(config.storage);
                let operations = await flow_manager.load_operations(operations_batch);

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

                    operations = await flow_manager.load_operations(operations_batch);
                }

                expect(complete).to.be.eq(10);

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
                    if(!op.completed)
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
                        expect(history.length).to.be.eq(3, 'Operation History length');
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

                    const originalFlow = flows[keys[idx]];

                    const first_flow = JSON.parse(JSON.stringify(originalFlow));

                    const storage = config.storage;
                
                    const flat = storage.json_flow_to_storage_flow(first_flow);

                    dbg('FLAT', JSON.stringify(flat, null, 4));

                    const hierarchical = storage.storage_flow_to_json_flow(flat.operations);
                
                    dbg('FLOW', JSON.stringify(hierarchical, null, 4));

                    expect(hierarchical).to.be.eql(originalFlow, 'The original flow and the storage => hierarchical differ');

                });

            }

            it('should redo an operation', async () => {

                const error_flow = JSON.parse(JSON.stringify(flows.errorFlow));
    
                const storage = config.storage;
    
                const flow_manager= new flow(storage);
    
                let event_error = false;
    
                flow_manager.on('suspend', (flow_id)=>{ 
                    dbg('opflow-error', flow_id);
                    event_error = true; }
                );
    
                const flow_id = await flow_manager.save_flow(error_flow);
    
                const operations = await flow_manager.get_storage_flow(flow_id);
            
                const error_operation = operations.find((el) => { return el.name === 'user-error';});
    
                expect(error_operation).to.not.be.an('undefined', 'error op undefined');
    
                const op_id = error_operation.id;
    
                await flow_manager.register_failure(error_operation, 'test error');

                if('../storage/disk' === config.data.storage)
                {
                    await config.change_storage(undefined);
                }
    
                const error_operation2 = await flow_manager.get_operation(op_id);
    
                expect(error_operation2).to.not.be.an('undefined', 'error op undefined 2');
    
                expect(error_operation2.completed).to.be.true;
    
                expect(event_error).to.be.true;
    
                await flow_manager.redo(error_operation.id);
                
                const error_operation3 = await flow_manager.get_operation(op_id);
    
                expect(error_operation3.completed).to.be.false;
    
    
            });

        });

    }

    describe('handle broken flow descriptor', () => {

        const brokenFlows = require('./broken');

        for(let idx = 0; idx < brokenFlows.broken.length; idx++)
        {
            it(brokenFlows.broken[idx].case, () => {

                let broken = false;
                try{
                    config.storage.json_flow_to_storage_flow(brokenFlows.broken[idx].flow);
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

    //describe('ERROR HANDLING', () => {
        
        
    //});

    

});

