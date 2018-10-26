const chai   = require('chai');
//const dbg    = require('debug')('opflow:unit-test');
const flows  = require('./flows');
const config = require('../config');

const expect = chai.expect;

const unitTest = require('../unit-test');

describe('UNIT-TEST TESTING', () => {

    after(() => {config.storage = null;});

    const keys = Object.keys(flows);

    for(let idx = 0; idx < keys.length; idx++)
    {
        const key = keys[idx];

        it('should run unit test for flow ' + key , async () => {
            
            const operations = await unitTest(flows[key]);

            const end = operations.find ( (el) => {return el.type === 'END';} );

            expect(end.completed).to.be.true;

        });

    }
});

