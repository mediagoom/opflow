

const processor_map = {
    'system' : {
        'NULL' : '../operation/system/null'
        , 'START' : '../operation/system/start'
        , 'END' :'../operation/system/end'
        , 'JOIN' : '../operation/system/join'
        , 'IF' : '../operation/system/if'
        , 'WHILE' : '../operation/system/while'
        , 'LOOP' : '../operation/system/loop'
        , 'ERROR' : '../operation/system/error'
    }
    , 'user' :
    {
        'execute' : '../operation/user/execute'
        , 'echo' : '../operation/user/echo'
        , 'code' : '../operation/user/code'
        , 'error' : '../operation/user/error'
    }
};


module.exports = processor_map;