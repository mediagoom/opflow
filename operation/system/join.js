const assert = require('assert');//.strict;

module.exports = 
{
    /**
     * The join operation has to export a property bag from all parents.
     */
    process : async function(config, propertyBag, operation, flow)
    {
        let operation_parent = await flow.get_parent(operation);

        assert(Array.isArray(operation_parent), 'JOIN OPERATION WITHOUT A PARENT ARRAY');
        
        for(let idx = 0; idx < operation_parent.length; idx++)
        {
            const opo = await flow.get_operation(operation_parent[idx]);

            assert(opo.succeeded);assert(opo.completed);
            assert(undefined !== opo && null !== opo, 'Cannot get operation for ' + operation_parent[idx]);
            assert(undefined !== opo.propertyBag && null !== opo.propertyBag, 'Cannot get propertyBag for ' + operation_parent[idx]);
            
            let keys = Object.keys(opo.propertyBag);

            for(let j = 0; j < keys.length; j++)
            {
                const k = keys[j];
                if(undefined === propertyBag[k])
                {
                    propertyBag[k] = opo.propertyBag[k];
                }
                else
                {

                    if(!Array.isArray(propertyBag[k]))
                    {
                        if(propertyBag[k] !== opo.propertyBag[k])
                        {
                            const val = propertyBag[k];
                            propertyBag[k] = [val];
                            propertyBag[k].push(opo.propertyBag[k]);
                        }
                    }
                    else
                    {
                        propertyBag[k].push(opo.propertyBag[k]);
                    }
                    
                }
                
            }

        }

        return 'JOIN';
    }
};