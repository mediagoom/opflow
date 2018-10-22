const memory = require('../storage/memory');
const dbg    = require('debug')('opflow:diskStorage');
const config = require('../config');
const util   = require('util');
const fs     = require('fs');
const Path   = require('path');

const Stat = util.promisify(fs.stat);
const Mkdir = util.promisify(fs.mkdir);
const WriteFile = util.promisify(fs.writeFile);
const ReadDir = util.promisify(fs.readdir);
const Delete = util.promisify(fs.unlink);
const ReadFile = util.promisify(fs.readFile);
const CopyFile = util.promisify(fs.copyFile);

async function directory_exist_or_create(path) {
    //const stat = await Stat(path);
    try{
        await Mkdir(path, { recursive: true });
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

async function move_file(source_path, destination_path)
{
    try{
        await Delete(destination_path);
    }catch(err)
    {
        dbg('file not already exist %j', err);
    }
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

    async complete_flow(flow_id)
    {
        const source = this.file_path(flow_id);

        move_file(
            Path.join(this.path, source)
            , Path.join(this.complete_path, source)
        );
    }

    async is_flow_completed(flow_id)
    {
        const source = this.file_path(flow_id);
        try{
            const stat = await Stat(Path.join(this.complete_path, source));
            if(stat.isFile())
                return true;
        }catch(err)
        {
            dbg('file not exist %j', err); 
        }

        return super.is_flow_completed(flow_id);
    }

    async flow_changed(flow, ended)
    {
        dbg('flow changed', flow.flow.id, ended);

        await this.disk_save_flow(flow);
        if(ended)
        {
            await this.complete_flow(flow.flow.id);
            await super.discard_flow(flow.flow.id);
        }
    }

    async reset(hard)
    {
        await directory_exist_or_create(this.path);
        await directory_exist_or_create(this.complete_path);
        await directory_exist_or_create(this.suspended_path);

        const working = get_files(this.path);
        

        for(let idx = 0; idx < working.length; idx++)
        {
            if(true === hard)
            {                
                move_file(
                    Path.join(this.path, working[idx])
                    , Path.join(this.suspended_path, working[idx])
                );
                
            }else
            {
                const json = ReadFile(Path.join(this.path, working[idx]));
                const flow_id = this.flow_id_from_path(working[idx]);

                const operations = JSON.parse(json);

                const flow = this.storage_operations_to_storage_flow(operations);

                flow.flow = {id : flow_id};

                super.flows.push(flow);
                
            }
        }
     

        return super.reset();
    }
};