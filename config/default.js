
module.exports = {
    
    port: process.env.OPFLOWSPORT || 9900
    
    , storage : process.env.OPFLOWSTORAGE || '../storage/disk'

    , typemap : process.env.OPFLOWTYPEMAP || '../operation/typemap'
    
    /*
    , get storage()
    {
        return new require(this.config_storage);
    }
    */
    
};

