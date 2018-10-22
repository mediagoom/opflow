
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

const simplejoin = {
    root: {
        type : 'START'
        , name : 'ROOT'
        , children:[
            {
                type: 'NULL'
                , name: 'FIRST'
                , children:[
                    {type: 'JOIN'
                        , name: 'SINGLEJOIN'
                        , children:[{type: 'END'}]
                    }
                ]
            }
            , {
                type: 'NULL'
                , name: 'SECOND'
                , children:[
                    {type: 'JOIN', name: 'SINGLEJOIN'}
                ]
            }
        ]
    }
};

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
                                , name: 'SINGLEJOIN'
                                
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
                            {type: 'JOIN', name: 'SINGLEJOIN'}
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
                    code: ` propertyBag.pippo = 'pippo'; 
                            propertyBag.pluto = '12345';
                    `
                }
                , children:[
                    {
                        type: '../operation/user/code'
                        , name: 'echo code1'
                        , config: {
                            code: ` propertyBag.pippo1 = propertyBag.pippo + propertyBag.pluto;
                            propertyBag.pippo = 'pippo1';
                            `
                        }
                        , children: [{
                            type: 'JOIN'
                            , name: 'SINGLEJOIN'
                            
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
                        }]
                        
                    }
                    , {
                        type: '../operation/user/code'
                        , name: 'echo code 2'
                        , config: {
                            code: ` propertyBag.pippo = 'pippo2' 
                            let a = propertyBag.pippo + '--' + '12345';
                            a;
                            `
                        }
                        , children: [{
                            type: 'JOIN'
                            , name: 'SINGLEJOIN'
                        }
                        ]
                    } 
                    , {
                        type: 'code'
                        , name: 'echo code 3'
                        , config: {
                            code: ` propertyBag.pippo = 'pippo3' 
                            let a = propertyBag.pippo + '--' + '12345';
                            a;
                            `
                        }
                        , children: [{
                            type: 'JOIN'
                            , name: 'SINGLEJOIN'
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
    , simplejoin
    , simpleEcho
    , basicCode
};