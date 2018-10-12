/* global describe it */
const chai   = require('chai');
const config = require('../config');
const dbg    = require('debug')('opflow:test');
const operation = require('../operation').Operation;
const flow  = require('../operation').Flow;

const expect = chai.expect;

describe('OPFLOW',  () => {

    describe('STORAGE',  () => {
        
        it('should support add flow method', async () => {

            const firstflow = new flow('TESTFLOW');
            const firstop = new operation('1', 'FIRST', { name: 'name1'}, 'NULL');
            const secondop = new operation('2', 'SECOND', { name: 'name2'}, 'NULL');

            firstflow.addOp(firstop);
            firstflow.addOp(secondop);

            dbg('STORAGE', config.data.storage);

            const storage = config.storage;

            dbg('EVENTS', storage.events);

            storage.addFlow(flow);

            return;

        });
    });

});