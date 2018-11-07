const dbg    = require('debug')('opflow:read-file');
const fs     = require('fs');
const util   = require('util');

const ReadFile = util.promisify(fs.readFile);


module.exports = {
    process : async function(config/*, propertyBag*/)
    {

        dbg('read-file', config.path);

        let encoding = 'utf8';

        if(undefined !== config.encoding)
            encoding = config.encoding;

        return ReadFile(config.path, encoding);

    }
};