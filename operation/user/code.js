


module.exports = {
    process : async function(config, propertyBag)
    {
        const vm = require('vm');

        let result = vm.runInNewContext(config.code, {config: config, propertyBag: propertyBag});

        return result;

    }
};