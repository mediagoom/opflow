

module.exports = {
    
    Wait : (ms) =>
    {
        return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
            setTimeout(()=> {resolve();}, ms);
        });
    }
};