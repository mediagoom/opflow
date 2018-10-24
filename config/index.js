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
        this._typeMap = null;
    }
    /**
     * Return the current typeMap
     */
    get typeMap()
    {
        if(!this._typeMap)
        {
            this._typeMap = require(this.data.typeMap);
        }

        return this._typeMap;
    }
    /**
     * Set a new typeMap
     */
    set typeMap(val)
    {
        this._typeMap = val;
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
            this._storage = new storageClass(this.typeMap);    
            this._storage.init();    
        }
             
        return this._storage;

    }
    /**
     * Set a storage directly
     */
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
    /**
     * Get the current absolute path configured for the disk storage
     */
    get disk_storage_path()
    {
        if(Path.isAbsolute(this.data.disk_storage_path))
            return this.data.disk_storage_path;

        return Path.join(__dirname, this.data.disk_storage_path);
    }
    /**
     * Set the current absolute path configured for the disk storage
     */
    set disk_storage_path(val)
    {
        this.disk_storage_path = val;
    }
}

const config = new Config(_config);

module.exports = config;

