/* global describe it */
const chai   = require('chai');
const config = require('../config');
//const dbg    = require('debug')('opflow:missing-test');
const flow  = require('../operation').flow_manager;
const base_storage = require('../storage/basestorage');
const flows = require('./flows');

//const coordinator = require('../coordinator');
//const processor = require('../processor');

const expect = chai.expect;

class mockupStorage extends base_storage
{
    constructor()
    {
        super(require('../operation/typemap'));
    }
}

describe('MISSING', () => {

    describe('mockupStorage', () => { 

        it('should set storage', () => {
        
            const storage = new mockupStorage();

            config.storage = storage;


        });

        it('should not evaluate invalid id', () => {
            const storage = config.storage;

            expect(() => {storage.flow_id(undefined);} ).to.throw('undefined operation_id to flow_id');
        });

        it('should export and raise event', () => {
            const storage = config.storage;
            let raised = false;
            storage.on(storage.events[0], ()=> {raised = true;});
            storage.raiseEvent(storage.events[0]);
            expect(raised).to.be.true;
        });

        it('should throw DUPLICATED JOIN ID', () => {
            const storage = config.storage;
            const operations = [
                { type : 'JOIN', id : 1}
                , { type : 'JOIN', id : 2}
            ]
            ;
            
            expect(() => {storage.storage_flow_to_json_flow(operations);} ).to.not.throw('DUPLICATED JOIN ID');

            operations.push({ type: 'JOIN', id : 1});

            expect(() => {storage.storage_flow_to_json_flow(operations);} ).to.throw('DUPLICATED JOIN ID');
        });

        it('should throw ALL OPERATIONS SHOULD ONLY HAVE A PARENT', () => {
            const storage = config.storage;
            const operations = [
                { type : 'START', id : 1, children_id: [2]}
                , { type : 'null', id : 2, children_id: [3]}
                , { type : 'null', id : 3, children_id: [4]}
                , { type : 'end', id : 4}
            ]
            ;
            
            expect(() => {storage.storage_flow_to_json_flow(operations);} ).to.not.throw('ALL OPERATIONS SHOULD ONLY HAVE A PARENT');

            operations[3].children_id = [2]; //2 should have 3 and 1 as parents

            expect(() => {storage.storage_flow_to_json_flow(operations);} ).to.throw('ALL OPERATIONS SHOULD ONLY HAVE A PARENT');

            operations[3].children_id = [4]; //correct flow

            const err = /CONSTRUCT BRANCH: INVALID CHILD ID/g;

            expect(() => {storage.storage_flow_to_json_flow(operations);} ).to.not.throw(err);

            operations[3].children_id = [9]; //correct flow

            expect(() => {storage.storage_flow_to_json_flow(operations);} ).to.throw(err);


        });

        it('error operation should throw ', async () => {
            const storage = config.storage;

            const type = await storage.get_type('../operation/user/error');
            const err = 'operation processor not implemented';
            let msg = 'x';

            try{
                await type.process();
            }catch(theErr)
            {
                msg = theErr.message;
            }
            
            expect( msg ).to.be.eq(err);

        });
   
    });

    describe('memoryStorage', () => {


        it('invalid flow should throw', async ()=> {
            
            const storage_name = '../storage/memory';

            const storage = await config.change_storage(storage_name);

            const err = 'invalid flow name invalid_name';
            let msg = 'x';

            try{
                await storage.is_flow_completed('invalid_name');
            }catch(theErr)
            {
                msg = theErr.message;
            }
            
            expect( msg ).to.be.eq(err);

        });

        it('invalid operation should throw', async ()=> {
            
            const storage_name = '../storage/memory';

            const storage = await config.change_storage(storage_name);

            const err = 'undefined operation_id to get_operations';
            let msg = 'x';

            try{
                await storage.get_operation(undefined);
            }catch(theErr)
            {
                msg = theErr.message;
            }
            
            expect( msg ).to.be.eq(err);

        });

        it('should handle duplicated succeeded', async ()=> {
            
            const storage_name = '../storage/memory';

            const storage = await config.change_storage(storage_name);
            const flow_manager= new flow(storage);

            const first_flow = JSON.parse(JSON.stringify(flows.basicFlow)); 
            const second_flow = JSON.parse(JSON.stringify(flows.simpleJoin)); 

            const flow_id1 = await flow_manager.save_flow(first_flow);
            const flow_id2 = await flow_manager.save_flow(second_flow);

            await flow_manager.get_storage_flow(flow_id1);
            await flow_manager.get_storage_flow(flow_id2);

            let operations = await flow_manager.load_operations(1);
            const op1 = operations[0];
            op1.lease_time = new Date(2018, 1, 1);

            operations = await flow_manager.load_operations(1);
            const op2 = operations[0];

            expect(op2).to.be.eq(op1);

            await flow_manager.register_success(op1, 'FIRST');

            
            const err = /OPERATIONS ALREADY COMPLETED/g;
            let msg = 'x';

            try{
                await flow_manager.register_success(op1, 'SECOND'); 
            }catch(theErr)
            {
                msg = theErr.message;
            }
            
            expect( msg ).to.be.match(err);
            

        });

    });
});