const defaults = require('./default.js');
const Path = require('path');
const dbg = require('debug')('opflow:configuration');
let   _config  = require('./' + (process.env.NODE_ENV || 'development') + '.js');


_config = Object.assign({}, defaults, _config);

class Config
{
    constructor(data)
    {
        this.data = data;
        this._storage = null;
    }
    /** Return the singleton storage. 
     *  There can be only one storage.
    */
    get storage()
    {
        if(!this._storage)
        {
            dbg('loading storage', this.data.storage);
            const storageClass = require(this.data.storage);
            this._storage = new storageClass(require(this.data.typemap));    
            this._storage.init();    
        }
             
        return this._storage;

    }
    
    set storage(rhs)
    {
        this._storage = rhs;
    }
    /**
     * Allow to change the storage.
     * @param {string} storagePath the require path to the new storage.
     */
    async change_storage(storagePath)
    {
        dbg('change storage', storagePath);
        this.data.storage = storagePath;
        this._storage = null;

        await this.storage.reset();

        return this.storage;
    }

    get disk_storage_path()
    {
        return Path.join(__dirname, this.data.disk_storage_path);
    }
}

const config = new Config(_config);

module.exports = config;

