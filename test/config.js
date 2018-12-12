//const dbg    = require('debug')('opflow:config-test');

const chai   = require('chai');

const expect = chai.expect;
    
describe('CONFIG',  () => {

    let original_value = undefined;

    before(()=>{original_value = process.env.NODE_ENV;});
    after(()=>{process.env.NODE_ENV = original_value;});
    const environments = ['production', 'development', 'test', 'unexpected'];

    for(let idx = 0; idx < environments.length; idx++)
    {
        it('should support ' + environments[idx], async ()=>{

            process.env.NODE_ENV = environments[idx];

            const node_env = require('../config').node_env;

            let storage_path = 'development';

            if('production' === environments[idx])
            {
                storage_path = 'production';
            }
            
            expect(node_env()).to.be.equal(storage_path);
            

        });
    }

});

