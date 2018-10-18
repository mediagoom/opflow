


module.exports = {
    process : async function(config, propertybag)
    {
        const vm = require('vm');

        let result = vm.runInNewContext(config.code, {config: config, propertybag: propertybag});

        return result;

    }
};