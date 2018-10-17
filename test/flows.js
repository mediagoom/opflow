
const basicflow = {
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

const simpleecho = {
    root: {
        type : 'START'
        , name : 'ROOT'
        , children:[
            {
                type: 'echo'
                , name: 'ECHO FIRST'
                , config: 'HELLO FROM ECHO'
                , children:[
                    {type: 'JOIN'
                        , name: 'SINGLEJOIN'
                        , children:[{type: 'END'}]
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
};

module.exports = {
    basicflow
    , simplejoin
    , simpleecho
};