const dbg    = require('debug')('opflow:write-file');
const fs     = require('fs');
const util   = require('util');

const WriteFile = util.promisify(fs.writeFile);


module.exports = {
    process : async function(config/*, propertyBag*/)
    {

        dbg('write-file', config.path);

        return WriteFile(config.path, config.content);

    }
};