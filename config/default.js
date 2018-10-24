
module.exports = {
    
    port: process.env.OPFLOWSPORT || 9900
    
    , storage : process.env.OPFLOWSTORAGE || '../storage/disk'

    , typeMap : process.env.OPFLOWTYPEMAP || '../operation/typemap'

    , disk_storage_path : process.env.OPFLOWDISKPATH || '../disk'
    
    /*
    , get storage()
    {
        return new require(this.config_storage);
    }
    */
    
};

