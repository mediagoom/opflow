const EventEmitter = require('events');
const dbg    = require('debug')('opflow:basestorage');

const operation_default =  {
    'id': null
    ,'name': null
    ,'config': null
    ,'type': 'NULL'
    ,'asof': null
    ,'children': []
    ,'result': null
    ,'completed': false
    ,'successed': false
    ,'history': null
    ,'created': null
    ,'modified': null
    ,'propertybag': null
    ,'stoponerror' : true
};

class storageError extends Error
{
    constructor(msg)
    {
        super(msg);

    }
}

class validationError extends storageError
{
    constructor(msg, operation)
    {
        super(msg);
        this.operation = operation;
    }
}

const anchor = new Date(2100, 0, 0).getTime();
let increment = 0;

const STORAGEEVENT = Object.freeze({
    NEW:  'new'
    , OPNEW: 'opnew'
    , ERROR:  'error'
    , MODIFIED: 'modified'
});

function pad(num, size) {
    var s = '000000000000' + num;
    return s.substr(s.length-size);
}


function newid()
{
    const create = Date.now();
    const seconds = (anchor - create) / 1000;
    const n = pad(seconds.toFixed(0), 12);
    const j = pad(++increment, 4);

    return n.toString() + '-' + j;
}

function opid(flowid)
{
    return flowid + '/' + newid();
}

function op_default(op)
{    
    return Object.assign({}, operation_default, op);
    
}

function find_join(targetjoin, joins)
{
    let join = joins.find(function(val)
    {
        return targetjoin.name === val.name;
    });

    return join;
}

function flatten_tree(flowid, root, operations, joins)
{
    root = op_default(root);
    root.children_id = [];

    if(null == root.id)
        root.id = opid(flowid);

    root.children.forEach(element => {
        
        if(null == element.id)
            element.id = opid(flowid);

        if(element.type == 'JOIN')
        {
            if(1 !== root.children.length)
            {
                throw new validationError('JOIN SHOULD BE THE ONLY CHILD', root);
            }
            //Same join name -> same id        
            const join = find_join(element, joins);
            if( undefined !== join)
                element.id = join.id;
        }

        root.children_id.push(element.id);
    });

    if(root.type != 'JOIN')
    {
        operations.push(root);

        if(root.type != 'END')
        {
            if(0 == root.children.length) 
            {
                throw new validationError('ALL OPERATIONS SHOULD HAVE AT LEAST A CHILD', root);
            }

            root.children.forEach(element => {
                flatten_tree(flowid, element, operations, joins);
            });
        }
    }
    else
    {
        const join = find_join(root, joins);

        if(undefined === join)
        {
            joins.push(root);

            if(0 === root.children.length) 
            {
                throw new validationError('ALL OPERATIONS SHOULD HAVE AT LEAST A CHILD', root);
            }

            //add the join to our operation list
            operations.push(root);            
            //we never seen this join so process children
            root.children.forEach(element => {
                flatten_tree(flowid, element, operations, joins);
            });
        }
        else
        {
            //terminating join
            if(0 !== root.children.length) 
            {
                throw new validationError('ONLY FIRST JOIN SHOULD HAVE CHILDREN', root);
            }
        }
    }
    
}




class basestorage extends EventEmitter{

    constructor()
    {
        super();
        
    }

    static throw_storage_error(msg)
    {
        throw new storageError(msg);
    }

    flow_id(opid)
    {
        if(undefined === opid)
        {
            throw new storageError('undefined opid to flow_id');
        }

        /*
        if('string' !== (typeof opid))
        {
            throw new storageError('invalid opid type ' + (typeof opid));
        }
        */

        return opid.toString().split('/')[0];
    }

    /*
    async begin_flow(flow)
    {
     
    }

    async add_operation(flow, op)
    {

    }

    async end_flow(flow)
    {

    }
    */
    
    /** flatten out the flow hierarchy */
    json_flow_to_storage_flow(jsonflow)
    {
        const operations = [];
        const joins = [];

        let root = jsonflow.root;

        if(null == root || root.type != 'START')
        {
            this.throw_storage_error('INVALID ROOT OPERATION');
        }

        if(null == jsonflow.id)
        {
            jsonflow.id = newid();
        }

        flatten_tree(jsonflow.id, root, operations, joins);

        dbg('OPERATIONS', JSON.stringify(operations, null, 4));

        let parents = {};
        let joins_parents = {};

        joins.forEach( element => {
            
            if(undefined !== joins_parents[element.id])
            {
                throw new validationError('DUPLICATED JOIN ID', element);
            }

            joins_parents[element.id] = [];
        });

        operations.forEach(element => {
            element.children_id.forEach(childid => {

                //if child is a join
                if(undefined !== joins_parents[childid])
                {
                    joins_parents[childid].push(element.id);
                }
                else
                {
                    if(undefined !== parents[childid])
                    {
                        dbg('Duplicated parent', childid, JSON.stringify(parents, null, 4));
                        throw new validationError('ALL OPERATIONS SHOULD ONLY HAVE A PARENT', element);
                    }
                    else
                    {
                        parents[childid] = element.id;
                    }
                }
            });
        });

        return {'flow': jsonflow
            , 'operations' : operations
            , 'joins' : joins
            , 'parents' : parents
            , 'joinsparents': joins_parents
        };

    }

    /*
    storage_flow_to_json_flow(storageflow)
    {

    }
    */
    
    get events(){ return STORAGEEVENT; }

    raiseEvent(storevent)
    {
        this.emit(storevent);
    }
}

module.exports = basestorage;

//export {basestorage, STORAGEEVENT}