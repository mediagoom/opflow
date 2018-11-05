module.exports = {
    process : async function() { 
        throw new Error('user error operation'); 
    }
    , retries: 1
}; 