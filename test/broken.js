

module.exports = { broken : [
    {
        case : 'no child'
        , flow: {
            root: {
                type : 'START'
                , name : 'ROOT'
                , children:[
                    {
                        type: 'NULL'
                        , name: 'FIRST'
                        , children:[
                            {
                                type: 'JOIN'
                                , name: 'SingleJoin'
                                //, children:[{type: 'END'}]
                            }
                        ]
                    }
                    , {
                        type: 'NULL'
                        , name: 'SECOND'
                        , children:[
                            {type: 'JOIN', name: 'SingleJoin'}
                        ]
                    }
                ]
            }
        }
    }


    ,{
        case : 'no start'
        , flow: {
            root: {
                type : 'NULL'
                , name : 'ROOT'
                , children:[
                    {
                        type: 'NULL'
                        , name: 'FIRST'
                        , children:[
                            {
                                type: 'JOIN'
                                , name: 'SingleJoin'
                                , children:[{type: 'END'}]
                            }
                        ]
                    }
                    , {
                        type: 'NULL'
                        , name: 'SECOND'
                        , children:[
                            {type: 'JOIN', name: 'SingleJoin'}
                        ]
                    }
                ]
            }
        }
    }

    ,{
        case : 'no end'
        , flow: {
            root: {
                type : 'START'
                , name : 'ROOT'
                , children:[
                    {
                        type: 'NULL'
                        , name: 'FIRST'
                        , children:[
                            {
                                type: 'JOIN'
                                , name: 'SingleJoin'
                                , children:[{type: 'NULL'}]
                            }
                        ]
                    }
                    , {
                        type: 'NULL'
                        , name: 'SECOND'
                        , children:[
                            {type: 'JOIN', name: 'SingleJoin'}
                        ]
                    }
                ]
            }
        }
    }

    ,{
        case : 'two join with children'
        , flow: {
            root: {
                type : 'START'
                , name : 'ROOT'
                , children:[
                    {
                        type: 'NULL'
                        , name: 'FIRST'
                        , children:[
                            {
                                type: 'JOIN'
                                , name: 'SingleJoin'
                                , children:[{type: 'END'}]
                            }
                        ]
                    }
                    , {
                        type: 'NULL'
                        , name: 'SECOND'
                        , children:[
                            {type: 'JOIN', name: 'SingleJoin'
                                , children:[{type: 'NULL'}]
                            }
                        ]
                    }
                ]
            }
        }
    }
    , {
        case : 'join not single child'
        , flow: {
            root: {
                type : 'START'
                , name : 'ROOT'
                , children:[
                    {
                        type: 'NULL'
                        , name: 'FIRST'
                        , children:[
                            {
                                type: 'JOIN'
                                , name: 'SingleJoin'
                                , children:[{type: 'END'}]
                            }
                            , {type: 'END'} 
                        ]
                    }
                    , {
                        type: 'NULL'
                        , name: 'SECOND'
                        , children:[
                            {type: 'JOIN', name: 'SingleJoin'}
                        ]
                    }
                ]
            }
        }
    }
]};