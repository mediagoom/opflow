const cp       = require('child_process');
const path     = require('path');
//const dbg      = require('debug')('opflow:execute');
//const verbose  = require('debug')('opflow:execute-verbose');
const os       = require('os');


async function Spawn(cmd, args, options)
{
    return new Promise( ( resolve, reject) => {

        let resolved = false;

        let output = { console : [], err : [] };

        let child = cp.spawn( cmd , args, options 
            /*, {                           
                stdio: [ 'ignore', outs, errs ]
                , cwd: process.cwd()
            
            }*/);
        
        child.on('error', (err) => { 
            resolved = true; 
            reject(err); 
        });
        
        child.on('close', (code, signal) => { 
            resolved = true;
            resolve( {code, signal, output } );
        } );

        child.on('exit', (code, signal) => { 
            if(!resolved)
                resolve( {code, signal, output } );
        }); 

        child.stdout.on('data', (data) => {
            //verbose(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>: ${g[k].name}`);
            //verbose(`stdout: ${data}`);
            //verbose(`---------------------------------------: ${g[k].name}`);
            //verbose(data.toString().split('\n'));
            //verbose(`<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<: ${g[k].name}`);
            let d = '' + data;

            output.console.push(d);
            
        });

        child.stderr.on('data', (data) => {
            //verbose(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>: ${g[k].name}`);
            //verbose(`stderr: ${data}`);
            //verbose(`<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<: ${g[k].name}`);
            let d = '' + data;
            output.err.push(d);
            
        });

    } );
}

const default_options = {};
/**
 * 
 * config.PATH is added to the process PATH. To replace the PATH use config.options.env.PATH.
 * 
 */
module.exports = {
    
    process : async function(config , propertyBag)
    {
        let options = config.options || {};

        options = Object.assign({}, default_options, options);

        let expected_code = config.expected_code || 0;

        /*
        
        */
        if(
            (undefined === options.env || undefined === options.env.PATH)
            && (undefined !== config.PATH)
        )
        {
            if(undefined === options.env)
            {
                options.env = {};
            }

            options.env.PATH = config.PATH + path.delimiter + process.env.PATH;
        }

        if(undefined !== config.cmd)
        {
            const result = await Spawn(config.cmd, config.args, options);
            
            propertyBag.execute = result;
            
            if(result.code != expected_code)
            {
                throw 'Invalid code found ' + result.code;
            }
            
            return result.output.console.join(os.EOL);
            
        }
        else
        {
            if(undefined === config.exec)
            {
                throw 'EITHER CMD OR EXEC';
            }

            throw 'NOT IMPLEMENTED';
        }
    }

};