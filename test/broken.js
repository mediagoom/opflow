

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
                                , name: 'SINGLEJOIN'
                                //, children:[{type: 'END'}]
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
                                , name: 'SINGLEJOIN'
                                , children:[{type: 'NULL'}]
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
                                , name: 'SINGLEJOIN'
                                , children:[{type: 'END'}]
                            }
                        ]
                    }
                    , {
                        type: 'NULL'
                        , name: 'SECOND'
                        , children:[
                            {type: 'JOIN', name: 'SINGLEJOIN'
                                , children:[{type: 'NULL'}]
                            }
                        ]
                    }
                ]
            }
        }
    }
]};