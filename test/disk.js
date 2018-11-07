const chai   = require('chai');
const config = require('../config');
//const dbg    = require('debug')('opflow:missing-test');
const flow  = require('../operation').flow_manager;
//const diskStorage = require('../storage/disk');
const testFlows = require('./flows');

//const coordinator = require('../coordinator');
//const processor = require('../processor');

const expect = chai.expect;

const disk_path_disk = '../storage/disk';
const disk_path_memory = '../storage/memory';

describe('DISK', () => {

    after(() => {
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

});