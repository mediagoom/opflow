
module.exports = {
    process : async function(config, propertybag)
    {
        let result = 'ECHO: ';
        if(null != config)
        {
            result += JSON.stringify(config, null, 4);
            result += '\n';
        }
        else
        {
            result += '[no config]';
        }

        if(null != propertybag)
        {
            result += JSON.stringify(propertybag, null, 4);
            result += '\n';
        }
        else
            result += '[no propertybag]';

        return result; 
    }
};