
const test = require('./test/test-util');
const opflow = require('./index.js');

module.exports = async function(flow, timeout_ms)
{
    const json_flow = JSON.parse(JSON.stringify(flow));

    if(undefined === timeout_ms)
    {
        timeout_ms = 1000;
    }

    opflow.configure({processor : {polling_interval_seconds : 0.001}});

    const flow_id = await opflow.add_flow(json_flow);

    opflow.start();

    //dbg('processor-started');

    const start = new Date();

    while(! await opflow.is_flow_completed(flow_id) )
    {
        const now = new Date();

        if( timeout_ms < (now.getTime() - start.getTime()))
        {
            throw 'timeout';
        }

        await test.Wait(10);
    }                    
        
    opflow.stop();
                            
    const operations = await opflow.get_runtime_flow(flow_id);

    if(0 >= operations.length)
        throw 'NO OPERATIONS';

    return operations;

};
