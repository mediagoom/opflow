
const test = require('./test/test-util');
const opflow = require('./index.js');

/**
 * Make a serializable error object.
 *
 * To create serializable errors you must re-set message so
 * that it is enumerable and you must re configure the type
 * property so that is writable and enumerable.
 *
 * @param {number} status
 * @param {string} message
 * @param {string} type
 * @param {object} props
 * @private
 */
function createError (status, message, type, props) {
    var error = new Error();

    // capture stack trace
    Error.captureStackTrace(error, createError);

    // set free-form properties
    for (var prop in props) {
        error[prop] = props[prop];
    }

    // set message
    error.message = message;

    // set status
    error.status = status;
    error.statusCode = status;

    // set type
    Object.defineProperty(error, 'type', {
        value: type
        ,enumerable: true
        ,writable: true
        ,configurable: true
    });

    return error;
}

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

        await test.Wait(10);
    }                    
        
    opflow.stop();
                            
    const operations = await opflow.get_runtime_flow(flow_id);

    if(0 >= operations.length)
        throw 'NO OPERATIONS';

    return operations;

};
