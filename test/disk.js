const chai   = require('chai');
const config = require('../config');
//const dbg    = require('debug')('opflow:disk-test');
const flow  = require('../operation').flow_manager;

const testFlows = require('./flows');

const expect = chai.expect;

const disk_path_disk = '../storage/disk';
const disk_path_memory = '../storage/memory';

describe('DISK', () => {

    after(() => {
        config.storage.reset(true);
        config.storage = null;
        config.data.storage = disk_path_memory;
    });
    
    it('should save and reload', async () => {
        
        await config.change_storage(disk_path_disk);

        const first_flow = JSON.parse(JSON.stringify(testFlows.simpleEcho));
        const save_flow = JSON.parse(JSON.stringify(testFlows.simpleEcho));  
        let flow_manager= new flow(config.storage);

        const flow_id = await flow_manager.save_flow(save_flow);

        //reset storage
        await config.change_storage(disk_path_disk);

        flow_manager= new flow(config.storage);
        const flows = await flow_manager.get_active_flows();

        expect(flows.length).to.be.greaterThan(0);

        const second_flow = await flow_manager.get_hierarchical_flow(flow_id);

        expect(first_flow).to.deep.include(second_flow);

   
    });

    it('memory should save and not reload', async () => {
        
        await config.change_storage(disk_path_memory);

        const first_flow = JSON.parse(JSON.stringify(testFlows.simpleEcho)); 
        let flow_manager = new flow(config.storage);

        const flow_id = await flow_manager.save_flow(first_flow);

        //reset storage
        await config.change_storage(disk_path_memory);
        flow_manager = new flow(config.storage);

        const flows = await flow_manager.get_active_flows();

        expect(flows.length).to.be.eq(0); 

        const noFlow = await flow_manager.get_hierarchical_flow(flow_id);
        expect( noFlow ).to.be.undefined;
   
    });

    it('should hard reset', async () => {

        await config.change_storage(disk_path_disk);
        await config.storage.reset(true);

    });

    it('should suspend and redo', async () => {
        
        await config.change_storage(disk_path_disk);

        const save_flow = JSON.parse(JSON.stringify(testFlows.simpleEcho));  
        
        let flow_manager= new flow(config.storage);
        let flows = await flow_manager.get_active_flows();
        let start_count = flows.length;

        const flow_id = await flow_manager.save_flow(save_flow);
        flows = await flow_manager.get_active_flows();
        expect(flows.length).to.be.eq(start_count + 1, 'flow should be active');

        const operations = await flow_manager.get_storage_flow(flow_id);
        const operation = operations[0];

        await flow_manager.register_failure(operation, 'test failure 1');
        await flow_manager.register_failure(operation, 'test failure 2');
        await flow_manager.register_failure(operation, 'test failure 3');

        flows = await flow_manager.get_active_flows();
        expect(flows.length).to.be.eq(start_count, 'flow should be suspended');

        //reset storage
        await config.change_storage(disk_path_disk);

        flow_manager= new flow(config.storage);
        
        await flow_manager.redo(operation.id);

        flows = await flow_manager.get_active_flows();
        expect(flows.length).to.be.eq((start_count + 1), 'flow should be hydrated from suspended');

   
    });

});