
const basicFlow = {
    root: {
        type : 'START'
        , name : 'ROOT'
        , children:[
            {
                type: 'NULL'
                , name: 'FIRST'
                , children:[
                    {type: 'END'}
                ]
            }
        ]
    }
};

const simpleJoin = {
    root: {
        type : 'START', name : 'ROOT'
        , children:[
            {
                type: 'echo', name: 'FIRST'
                , children:[
                    {type: 'JOIN', name: 'FirstJoin'
                        , children : [
                            {type: 'JOIN', name: 'SecondJoin'
                                , children: [{type: 'END'}]    
                            }]}
                ]
            }
            , {
                type: 'echo', name: 'SECOND'
                , children:[{
                    type: 'echo', name: 'THIRD'
                    , children:[
                        {type: 'JOIN', name: 'FirstJoin'}
                    ]}]
            }
            , {
                type: 'echo', name: 'FOURTH'
                , children:[{
                    type: 'echo', name: 'FIFTH'
                    , children:[
                        {type: 'JOIN', name: 'SecondJoin'}
                    ]}]
            }
        ]
    }
};

/*

const simpleJoin = {
    root: {
        type : 'START'
        , name : 'ROOT'
        , children:[
            {
                type: 'NULL'
                , name: 'FIRST'
                , children:[
                    {type: 'JOIN'
                        , name: 'SingleJoin'
                        , children:[{type: 'END'}]
                    }
                ]
            }
            , {
                type: 'NULL'
                , name: 'SECOND'
                , children:[{
                    type: 'NULL'
                    , name: 'THIRD'
                    , children:[
                        {type: 'JOIN', name: 'SingleJoin'}
                    ]}]
            }
        ]
    }
};

*/

const simpleEcho = {
    root: {
        type : 'START'
        , name : 'ROOT'
        , children:[
            {
                type: 'echo'
                , name: 'ROOT ECHO'
                , config: 'HELLO FROM ROOT ECHO'
                , children:[
                    {
                        type: 'echo'
                        , name: 'ECHO FIRST'
                        , config: 'HELLO FROM ECHO'
                        , children:[
                            {
                                type: 'JOIN'
                                , name: 'SingleJoin'
                                
                                , children:[
                                    { type: '../operation/user/code'
                                        , name: 'echo code1'
                                        , config: {
                                            code: ` 3 + 7; 
                                         `
                                        }
                                        , children:[{type: 'END'}]
                                    }
                                ]
                                
                                
                            }
                        ]
                    }
                    , {
                        type: 'echo'
                        , name: 'ECHO SECOND'
                        , config: 'HELLO FROM ECHO 2'
                        , children:[
                            {type: 'JOIN', name: 'SingleJoin'}
                        ]
                    }
                ]
            }
        ]
    }
};

const basicCode = {
    root: {
        type : 'START'
        , name : 'ROOT'
        , children:[
            {
                type: 'code'
                , name: 'root code'
                , config: {
                    code: ` propertyBag.mickey = 'mickey'; 
                            propertyBag.pluto = '12345';
                            propertyBag.config.message = 'i am your parent';
                            propertyBag.config.doNotExist = 'i do not exist';
                            'i am your parent result';

                    `
                }
                , children:[
                    {
                        type: '../operation/user/code'
                        , name: 'echo code1'
                        , config: {
                            code: ` propertyBag.mickey1 = propertyBag.mickey + propertyBag.pluto;
                            propertyBag.mickey = 'mickey1';
                            if('i am your parent' !== config.message)
                                throw 'invalid config.message';
                            if('i am your parent result' !== propertyBag.parent.result)
                                throw 'invalid propertyBag.parent.result';
                            config.message;
                            `
                            , message : 'configuration_message'
                        }
                        , children: [{
                            type: 'JOIN'
                            , name: 'SingleJoin'
                            
                            , children:[
                                { type: '../operation/user/code'
                                    , name: 'echo code1'
                                    , config: {
                                        code: `3 + 7; 
                                     `
                                    }
                                    , children:[{type: 'END'}]
                                }
                            ]
                        }]
                        
                    }
                    , {
                        type: '../operation/user/code'
                        , name: 'echo code 2'
                        , config: {
                            code: ` propertyBag.mickey = 'mickey2' 
                            let a = propertyBag.mickey + '--' + '12345';
                            propertyBag.parent_result;
                            `
                        }
                        , children: [{
                            type: 'JOIN'
                            , name: 'SingleJoin'
                        }
                        ]
                    } 
                    , {
                        type: 'code'
                        , name: 'echo code 3'
                        , config: {
                            code: ` propertyBag.mickey = 'mickey3' 
                            let a = propertyBag.mickey + '--' + '12345';
                            a;
                            `
                        }
                        , children: [{
                            type: 'JOIN'
                            , name: 'SingleJoin'
                        }
                        ]
                    } 
                ] 
            }
        ]
    }
};

module.exports = {
    basicFlow
    , simpleJoin
    , simpleEcho
    , basicCode
};