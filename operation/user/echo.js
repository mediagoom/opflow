
module.exports = {
    process : async function(config, propertyBag)
    {
        let result = 'ECHO: ';
       
        result += JSON.stringify(config, null, 4);
        result += '\n';
          
        result += JSON.stringify(propertyBag, null, 4);
        result += '\n';
        
        return result; 
    }
};