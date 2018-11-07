
const test = require('./util');
const opflow = require('./index.js');

const createError = require('./error');

opflow.configure({processor : {polling_interval_seconds : 0.001}});

module.exports = async function(flow, timeout_ms)
{
    const json_flow = JSON.parse(JSON.stringify(flow));

    if(undefined === timeout_ms)
    {
        timeout_ms = 1000;
    }
           
    const flow_id = await opflow.add_flow(json_flow);
    
    opflow.start();

    //dbg('processor-started');

    const start = new Date();

    while( (! await opflow.is_flow_completed(flow_id) )
    )
    {
        const now = new Date();

        if( timeout_ms < (now.getTime() - start.getTime()))
        {
            let props = {};
            let msg = 'timeout Error \n ';
            try{
                const hierarchy = await opflow.get_flow(flow_id); 
                props.flow = hierarchy;

                msg += JSON.stringify(hierarchy, null, 4);
                
            }
            catch(err)
            {
                msg += ' [ cannot get flow ] ' + err.message;
            }
            //throw msg;

            throw createError(2, msg, 'timeoutError', props);

        }

        await test.Wait(3);
    }                    
        
    opflow.stop();
                            
    const operations = await opflow.get_runtime_flow(flow_id);

    if(0 >= operations.length)
        throw 'NO OPERATIONS';

    return operations;

};
