
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

module.exports = {
    basicflow
    , simplejoin
};