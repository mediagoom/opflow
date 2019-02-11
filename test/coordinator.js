const chai   = require('chai');
const coordinator = require('../coordinator');
const dbg    = require('debug')('opflow:coordinator-test');
//const flows  = require('./flows');
const config = require('../config');


const expect = chai.expect;

class fake_flow_manager {
    constructor ()
    {

    }

    async load_operations()
    {
        throw new Error('coordinator test error');
        //return [];
    }

    async get_parent(){return undefined;}

    async get_operation(id)
    {
        return {
            id
            , processor_name : 'fake'
            , processor_work_id : '000000' 
        };
    }

    async get_hierarchical_flow()
    {
        return {};
    }

    on(){}
}

describe('COORDINATOR', () => {

    after(() => {config.storage = null;});

    const flow = new fake_flow_manager();
    const obj_coordinator = new coordinator(flow, {
        error_recorder : () => {}
    });

    it('get_work should throw ', async () =>{

        let thrown = false;
        let msg = '';
        try{
            await obj_coordinator.get_work('','');
        }catch(err)
        {
            thrown = true;
            msg = err.message;
        }
        
        dbg('MESSAGE', msg);

        expect(thrown).to.be.true;
        expect(msg).to.match(/test error/);
    });

    it('processed should throw ', async () =>{
       
        
        let thrown = false;
        let msg = '';
        try{
            const id = 'jj';
            obj_coordinator.working.push(await flow.get_operation(id));

            await obj_coordinator.processed(id, true, '--', {}, 'processor_name', 'processor_work_id');
        }catch(err)
        {
            thrown = true;
            msg = err.message;
            
        }
        
        dbg('MESSAGE', msg);

        expect(thrown).to.be.true;
        expect(msg).to.match(/invalid processor/);
    });

    it('should call get_hierarchical_flow', async () =>{
        obj_coordinator.get_hierarchical_flow(9);
    });
});