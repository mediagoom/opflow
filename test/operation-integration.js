const chai   = require('chai');
const os     = require('os');
const dbg    = require('debug')('opflow:operation-integration-test');

const expect = chai.expect;



describe('TEST OPERATIONS', () => {

    const execute = require('../operation/user/execute');

    if('win32' === os.platform())
    {
        it('execute', async () => {

            const propertyBag = {};
            
            const config = {
                cmd : 'ipconfig'
                , args : [ '/all' ]
            };

            const result = await execute.process(config, propertyBag);

            dbg('execute %s %s %O', os.platform(), result, propertyBag );

            expect(propertyBag.execute.code).to.be.eq(0, 'process return code');

        });
    }
    else
    {

        it('execute', async () => {

            const propertyBag = {};
            
            const config = {
                cmd : 'ip'
                , args : [ 'addr' ]
            };

            const result = await execute.process(config, propertyBag);

            dbg('execute %s %O', os.platform(), result );

        });
    }
   
});