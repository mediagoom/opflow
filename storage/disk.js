const memory = require('../storage/memory');
const dbg    = require('debug')('opflow:disk-test');
const config = require('../config');
const util   = require('util');
const fs     = require('fs');
const Path   = require('path');
const assert = require('assert');//.strict;

const Stat = util.promisify(fs.stat);
const Mkdir = util.promisify(fs.mkdir);
const WriteFile = util.promisify(fs.writeFile);
const ReadDir = util.promisify(fs.readdir);
const Delete = util.promisify(fs.unlink);
const ReadFile = util.promisify(fs.readFile);
const CopyFile = util.promisify(fs.copyFile);

async function safe_stat(path)
{
    try{
        const res = await Stat(path);
        return res;
    }catch(err)
    {
       dbg('safe_stat %j', err);
       return {
            isFile : () => {return false;}
       } ;
    }
}

async function directory_exist_or_create(path) {
    //const stat = await Stat(path);
    try{
        await Mkdir(path, { recursive: true });
    }catch(err)
    {
        dbg('directory_exist_or_create error %j', err);
        if(err.code !== 'EEXIST')
            throw err;
    }
}

function directory_exist_or_create_sync(path) {
    //const stat = await Stat(path);
    try{
        fs.mkdirSync(path, { recursive: true });
    }catch(err)
    {
        dbg('directory_exist_or_create error %j', err);
    }
}

async function get_files(path)
{
    const items = await ReadDir(path);
    const result = [];
    for(let idx = 0; idx < items.length; idx++)
    {
        const stat = await Stat(Path.join(path, items[idx]));
        if(stat.isFile())
            result.push(items[idx]);
    }

    return result;
}

function get_files_sync(path)
{
    const result = [];
    
    try{
        const items = fs.readdirSync(path);
   
        for(let idx = 0; idx < items.length; idx++)
        {
            const stat = fs.statSync(Path.join(path, items[idx]));
            if(stat.isFile())
                result.push(items[idx]);
        }
    }
    catch(e)
    {
        dbg('get_files_sync %j', e);
    }

    return result;
}

async function safe_delete(path)
{
    try{
        await Delete(path);
    }catch(err)
    {
        dbg('file not already exist %j', err);
    }
    
}

async function move_file(source_path, destination_path)
{
    await safe_delete(destination_path);
    await CopyFile(source_path, destination_path);
    await Delete(source_path);
}



module.exports = class diskStorage extends memory  {

    constructor(typeMap)
    {
        super(typeMap);
        this.path = config.disk_storage_path;

        this.complete_path = Path.join(this.path, 'completed');
        this.suspended_path = Path.join(this.path, 'suspended');
    }

    file_path(flow_id)
    {
        return flow_id + '.json';
    }

    flow_id_from_path(path)
    {
        return path.replace('.json', '');
    }

    async disk_save_flow(flow)
    {
        const source = this.file_path(flow.flow.id);

        return WriteFile(Path.join(this.path, source), JSON.stringify(flow.operations, null, 4));
    }

    async flow_suspended(operation_id)
    {
        const flow_id = this.flow_id(operation_id);

        const source = this.file_path(flow_id);

        await super.flow_suspended(operation_id);

        const p1 = move_file(
            Path.join(this.path, source)
            , Path.join(this.suspended_path, source)
        );

        await p1;

        return;
    }

    async redo(op_id)
    {
        const flow_id = this.flow_id(op_id);
        await this.get_operation(op_id);

        await super.redo(op_id);


        /*
        if(undefined === this.flows[flow_id])
        {
            

            await move_file(
                Path.join(this.suspended_path, source)
                , Path.join(this.path, source)
            );

            const flow = await this.load_flow_from_file(flow_id);
            if(undefined != flow)
            {
                this.flows[flow_id] = flow; 
            }
            else
            {
                throw new Error('Cannot find flow ' + flow_id);
            }
        }*/
        
        const source = this.file_path(flow_id);
        
        return safe_delete(Path.join(this.suspended_path, source));

        
    }

    async complete_flow(flow_id)
    {
        const source = this.file_path(flow_id);

        return move_file(
            Path.join(this.path, source)
            , Path.join(this.complete_path, source)
        );
    }

    async is_flow_completed(flow_id)
    {
        if(undefined !== this.flows[flow_id])
            return super.is_flow_completed(flow_id);

        const source = this.file_path(flow_id);
        try{

            let stat = await safe_stat(Path.join(this.complete_path, source));
            if(stat.isFile())
                return true;

            stat = await safe_stat(Path.join(this.suspended_path, source));
            assert(stat.isFile()); //is not in memory and is not completed
                
            return false;
          
        }catch(err)
        {
            dbg('is_flow_completed %j', err); 
        }

        
        
    }

    async operation_changed(operation_id, type, succeeded)
    {
        const flow_id = this.flow_id(operation_id);
        //await this.flow_changed(this.flows[flow_id], type);
        if(! await this.is_flow_completed(flow_id) )
        {
            return super.operation_changed(operation_id, type, succeeded);
        }
    }

    async flow_changed(flow, type)
    {
        dbg('flow changed', flow.flow.id, type);

        if('HISTORY' === type || 'ASoF' === type)
            return;

        try{

            await this.disk_save_flow(flow);
            if('END' == type)
            {
                await this.complete_flow(flow.flow.id);
                await super.discard_flow(flow.flow.id);
            }

        }catch(err)
        {
            dbg('flow changed error %j', err);
            throw err;
        }

    }

    async suspend_files()
    {
        const working = await get_files(this.path);
        
        for(let idx = 0; idx < working.length; idx++)
        {            
            await move_file(
                Path.join(this.path, working[idx])
                , Path.join(this.suspended_path, working[idx])
            );
        }
                
    }
    
    async load_storage_flow_from_file(flow_id, path)
    {
        if(undefined === path)
            path = this.path;

        const json = await ReadFile(Path.join(path, this.file_path(flow_id)));
      
        let operations = undefined;

        try{

            operations = JSON.parse(json);

        }catch(err)
        {
            console.warn('DISK LOAD_STORAGE_FROM_FILE', 'invalid json in file ' + flow_id);
            return undefined;
        }

        return operations;
    }

    async load_flow_from_file(flow_id, path)
    {
        const operations = await this.load_storage_flow_from_file(flow_id, path);
        if(undefined === operations)
            return undefined;

        const flow = this.storage_operations_to_storage_flow(operations);

        flow.flow = {id : flow_id};

        return flow;
    }

    load_flow_from_file_sync(flow_id, path)
    {
        if(undefined === path)
            path = this.path;

        const json = fs.readFileSync(Path.join(path, this.file_path(flow_id)));
       
        try{

            const operations = JSON.parse(json);

            const flow = this.storage_operations_to_storage_flow(operations);

            flow.flow = {id : flow_id};

            return flow;

        }catch(err)
        {
            console.warn('DISK LOAD_STORAGE_FROM_FILE_SYNC', 'invalid json in file ' + flow_id);
            return undefined;
        }
    }

    init()
    {
        super.init();

        directory_exist_or_create_sync(this.path);
        directory_exist_or_create_sync(this.complete_path);
        directory_exist_or_create_sync(this.suspended_path);
    
        const working = get_files_sync(this.path);

        for(let idx = 0; idx < working.length; idx++)
        {
            const flow_id = this.flow_id_from_path(working[idx]);

            const flow = this.load_flow_from_file_sync(flow_id);
            if(undefined != flow)
                this.flows[flow_id] = flow;
            
        }
    }

    async reset(hard)
    {
        await super.reset();

        const cleanup = (hard)?true:false;

        await directory_exist_or_create(this.path);
        await directory_exist_or_create(this.complete_path);
        await directory_exist_or_create(this.suspended_path);

        if(cleanup)
            await this.suspend_files();

        const working = await get_files(this.path);
        
        for(let idx = 0; idx < working.length; idx++)
        {
            const flow_id = this.flow_id_from_path(working[idx]);

            const flow = await this.load_flow_from_file(flow_id);
            if(undefined != flow)
                this.flows[flow_id] = flow;
            
        }
    }

    async get_storage_flow(flow_id)
    {
        let operations = await super.get_storage_flow(flow_id);
        
        if(undefined === operations)
        {
            const source = this.file_path(flow_id);
            try{

                const stat = await safe_stat(Path.join(this.complete_path, source));
                if(stat.isFile())
                {
                    operations = await this.load_storage_flow_from_file(flow_id, this.complete_path);
                }
            
            }catch(err)
            {
                dbg('get_storage_flow %j', err); 
            }

        }

        if(undefined === operations)
        {
            const source = this.file_path(flow_id);
            try{

                const stat = await safe_stat(Path.join(this.suspended_path, source));
                if(stat.isFile())
                {
                    operations = await this.load_storage_flow_from_file(flow_id, this.suspended_path);
                }
            
            }catch(err)
            {
                dbg('get_storage_flow [suspended] %j', err); 
            }

        }

        return operations;
    }

    
    async get_hierarchical_flow(flow_id)
    {
        const operations = await this.get_storage_flow(flow_id);

        if(undefined === operations)
            return undefined;
        const ops = JSON.parse(JSON.stringify(operations));
        return this.storage_flow_to_json_flow(ops);
        
    }
     
    
};