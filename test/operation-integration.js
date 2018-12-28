const chai   = require('chai');
const os     = require('os');
const dbg    = require('debug')('opflow:operation-integration-test');

const expect = chai.expect;


describe('TEST OPERATIONS', () => {

    const execute = require('../operation/user/execute');
    const code    = require('../operation/user/code');
    const write   = require('../operation/user/write-file');
    const read    = require('../operation/user/read-file');

    if('win32' === os.platform())
    {
        it('execute cmd', async () => {

            const propertyBag = {};
            
            const config = {
                cmd : 'ipconfig'
                , args : [ '/all' ]
                , include_err : true
            };

            const result = await execute.process(config, propertyBag);

            dbg('execute %s %s %O', os.platform(), result, propertyBag );

            expect(propertyBag.execute.code).to.be.eq(0, 'process return code');

        });

        it('execute exec', async function() {

            this.timeout(15000);

            const propertyBag = {};
            
            const config = {
                exec : 'ipconfig /all'
                , include_err : true
            };

            const result = await execute.process(config, propertyBag);

            dbg('execute %s %s %O', os.platform(), result, propertyBag );

            expect(propertyBag.exec.stdout).not.be.null;

        });
    }
    else
    {

        it('execute cmd', async () => {

            const propertyBag = {};
            
            const config = {
                cmd : 'ip'
                , args : [ 'addr' ]
                , include_err : true
            };

            const result = await execute.process(config, propertyBag);

            dbg('execute %s %O', os.platform(), result );

            expect(propertyBag.execute.code).to.be.eq(0, 'process return code');

        });

        it('execute exec', async () => {

            const propertyBag = {};
            
            const config = {
                exec : 'ip addr'
                , include_err : true
            };

            const result = await execute.process(config, propertyBag);

            dbg('execute %s %O', os.platform(), result );

            expect(propertyBag.exec.stdout).not.be.null;
        });
    }

    it('execute node cmd', async () => {

        const propertyBag = {};
        
        const config = {
            cmd : 'node'
            , args : [ './test/simpleExec.js' ]
            , include_err : false
        };

        const result = await execute.process(config, propertyBag);

        dbg('execute %s %O', os.platform(), result , JSON.stringify(propertyBag, null, 4));

        expect(propertyBag.execute.code).to.be.eq(0, 'process return code');
        expect(propertyBag.execute.output.console[0]).to.be.eq('simple exec\n');
        expect(propertyBag.execute.output.err[0]).to.be.eq('simple error\n');

    });

    it('exec throw', async () => {
        
        const propertyBag = {};
            
        const config = {
            exec : 'i_do_not_exist'
            , include_err : true
        };

        let thrown = false;
        let msg = '';

        try{
            await execute.process(config, propertyBag);
        }catch(err)
        {
            dbg('exec integration', err.message, err.stack);
            msg = err.message;
            thrown = true;
        }

        expect(thrown).to.be.eq(true, 'code did not thrown');
        expect(msg).to.match(/Command failed: i_do_not_exist/);
    });

    it('spawn throw', async () => {
        
        const propertyBag = {};
            
        const config = {
            cmd: 'i_do_not_exist'
            , args : []
            , include_err : true
        };
        

        let thrown = false;
        let msg = '';

        try{
            await execute.process(config, propertyBag);
        }catch(err)
        {
            dbg('exec integration', err.message, err.stack);
            msg = err.message;
            thrown = true;
        }

        expect(thrown).to.be.eq(true, 'code did not thrown');
        expect(msg).to.match(/ENOENT/);
    });

    it('write and read file', async () => {
       
        const content = `this is a test line
            in a test content`;

        const path = '/tmp/read-write-file';

        const propertyBag = {};
            
        const config = {path, content};
        
        await write.process(config, propertyBag);
        let out_content = await read.process(config, propertyBag);

        expect(out_content).to.be.eq(content);

        config.encoding = 'utf8';

        out_content = await read.process(config, propertyBag);

        expect(out_content).to.be.eq(content);


    });

    it('code throw', async () => {
        
        const propertyBag = {};
            
        const config = {
            code : `
                throw new Error('this is an error');
            `
        };

        let thrown = false;
        let msg = '';

        try{
            await code.process(config, propertyBag);
        }catch(err)
        {
            dbg('code integration', err.message, err.stack);
            msg = err.message;
            thrown = true;
        }

        expect(thrown).to.be.eq(true, 'code did not thrown');
        expect(msg).to.be.eq('this is an error');
    });
   
});