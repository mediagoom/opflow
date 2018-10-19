

module.exports = 
{
    /**
     * The join operation has to export a property bag from all parents.
     */
    process : async function(config, propertybag, operation, flow)
    {
        let opparent = await flow.get_parent(operation);

        if(!Array.isArray(opparent))
        {
            throw new Error('JOIN OPERATION WITHOUT A PARENT ARRAY');
        }

        for(let idx = 0; idx < opparent.length; idx++)
        {
            const opo = await flow.get_operation(opparent[idx]);

            let keys = Object.keys(opo.propertybag);

            for(let j = 0; j < keys.length; j++)
            {
                const k = keys[j];
                if(undefined === propertybag[k])
                {
                    propertybag[k] = opo.propertybag[k];
                }
                else
                {

                    if(!Array.isArray(propertybag[k]))
                    {
                        if(propertybag[k] !== opo.propertybag[k])
                        {
                            const val = propertybag[k];
                            propertybag[k] = [val];
                            propertybag[k].push(opo.propertybag[k]);
                        }
                    }
                    else
                    {
                        propertybag[k].push(opo.propertybag[k]);
                    }

                    
                    
                }
                
            }

        }

        return 'JOIN';
    }
};