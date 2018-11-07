const dbg    = require('debug')('opflow:code');
const dbgo   = require('debug')('opflow:-code-operation');
const dbge   = require('debug')('opflow:code-operation-error');


module.exports = {
    process : async function(config, propertyBag)
    {

        dbgo('require path', module.paths);

        const vm = require('vm');

        try{
        
            let result = vm.runInNewContext(config.code, {config: config, propertyBag: propertyBag, dbg, require});
            return result;

        }catch(err)
        {
            dbge('code error', err.message, err.stack);
            throw err;
        }

    }
};