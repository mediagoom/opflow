const assert   = require('assert');//.strict;
const cp       = require('child_process');
const path     = require('path');
const dbg      = require('debug')('opflow:execute');
//const verbose  = require('debug')('opflow:execute-verbose');
const os       = require('os');

async function Exec(exec, options)
{
    return new Promise( ( resolve, reject) => {
        
        cp.exec(exec, options, (err, stdout, stderr) => {
            if(null != err)
            {
                reject(err);
            }
            else
            {
                resolve({stdout, stderr});
            }
        });
    });
}

async function Spawn(cmd, args, options)
{
    return new Promise( ( resolve, reject) => {
       
        let output = { console : [], err : [] };

        let child = cp.spawn( cmd , args, options);

        child.resolved = false;
        
        child.on('error', (err) => { 
            child.resolved = true; 
            reject(err); 
        });
        
        child.on('close', (code, signal) => { 
            if(!child.resolved)
            {
                child.resolved = true;
                resolve( {code, signal, output } );
            }
        } );

        child.on('exit', (code, signal) => { 
            if(!child.resolved)
            {
                child.resolved = true;
                resolve( {code, signal, output } );
            }
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

        if(undefined === options.cwd)
            options.cwd = process.cwd();

        assert(undefined !== config.cmd || undefined !== config.exec);

        if(undefined !== config.cmd)
        {
            dbg('SPAWN %s %O %O', config.cmd, config.args, options);

            const result = await Spawn(config.cmd, config.args, options);
            
            propertyBag.execute = result;

            dbg('EXECUTED %O', result);
            
            if(result.code != expected_code)
            {
                throw new Error('Invalid code found ' + result.code);
            }
           
            let ret = result.output.console.join(os.EOL);

            if(true === config.include_err)
                ret += result.output.err.join(os.EOL); 

            return ret;
            
        }
        else
        {
            dbg('EXEC %s %O', config.exec, options);

            const res = await Exec(config.exec, options);  
            
            propertyBag.exec = res;

            let ret = res.stdout;

            if(true === config.include_err)
                ret += res.stderr;

            return ret;
            
        }
    }

};