
const defaults = require('./default.js');
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
            const storageclass = require(this.data.storage);
            this._storage = new storageclass(require(this.data.typemap));        
        }
             
        return this._storage;

    }
    /**
     * Allow to change the storage.
     * @param {string} storagepath the requre path to the new storage.
     */
    change_storage(storagepath)
    {
        this.data.storage = storagepath;
        this._storage = null;

        this.storage.reset();
    }
}

const config = new Config(_config);

module.exports = config;

