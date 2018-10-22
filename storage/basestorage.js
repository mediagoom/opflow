const EventEmitter = require('events');
const dbg    = require('debug')('opflow:basestorage');
const storageError = require('../storage/storageError');

const operation_default =  {
    'id': null
    ,'name': null
    ,'config': null
    ,'type': null
    ,'asOf': null
    ,'lease_time': null
    ,'children': null
    ,'result': null
    ,'completed': false
    ,'succeeded': false
    ,'executed': false
    ,'history': null 
    ,'created': null
    ,'modified': null
    ,'propertyBag': null
    ,'stoponerror' : true
};

const type_def =  {

    retries: 3
    , retries_interval: 300
    , lease: 3600
    , system: false
    , process : async function() { throw new Error('operation processor not implemented'); }

};



class validationError extends storageError
{
    constructor(msg, operation)
    {
        super(msg + ' ' + JSON.stringify(Object.assign({}, operation, {children : null, history: null})));
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

function opid(flow_id)
{
    return flow_id + '/' + newid();
}

function op_default(op)
{    
    let oper = Object.assign({}, operation_default, op);
    if(null == oper.children)
        oper.children = new Array();

    if('START' !== oper.type)
        oper.propertyBag = null; 
    else
        oper.propertyBag = {};

    return oper;
}

function type_default(t)
{    
    return Object.assign({}, type_def, t);
}

function find_join(targetjoin, joins)
{
    let join = joins.find(function(val)
    {
        return targetjoin.name === val.name;
    });

    return join;
}

function flatten_tree(flow_id, root, operations, joins)
{
    root = op_default(root);
    root.children_id = [];

    if(null == root.id)
        root.id = opid(flow_id);

    root.children.forEach(element => {
        
        if(null == element.id)
            element.id = opid(flow_id);

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
                flatten_tree(flow_id, element, operations, joins);
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
                flatten_tree(flow_id, element, operations, joins);
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

function index_opsparent_and_joins(operations, joins)
{
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
        
        delete element.children;

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

    return {'parents' : parents, 'joinsparents': joins_parents};
}

function construct_json_branch(root, flow)
{
    root.children = [];

    if('END' !== root.type && (
        'JOIN' !== root.type || undefined !== root.children_id
    ))
    {
        
        root.children_id.forEach( id => {
        
            const op = flow.operations.find( el => {return el.id === id; });

            if(undefined === op)
            {
                throw new validationError('CONSTRUCT BRANCH: INVALID CHILD ID ' + id, root); 
            }


            if('JOIN' === op.type  
                && undefined !== op.processedjoin   
            )
            {
               
                let join = {name : op.name, type : 'JOIN'};
                root.children.push(join);
                
            }
            else
                root.children.push(op);

            construct_json_branch(op, flow);
            
            if('JOIN' === op.type)
            {
                op.processedjoin = true;
            } 
            

        });

        
    }
    else
        delete root.children;
}


class basestorage extends EventEmitter{

    constructor(typemap)
    {
        super();
        this.typemap = typemap;
        this.types = {};
    }

    get_type_path(name)
    {
        let system = true;
        let p = this.typemap.system[name];

        if(undefined === p)
        {
            p = this.typemap.user[name];
            system = false;
        }

        return {path: p, system : system};
    }

    /** load a type given it name if it is register
     * or using directly the name. In this case should be contained it the map.
     */
    async get_type(name)
    {
        if(undefined === this.types[name])
        {
            const p = this.get_type_path(name); 
            if(undefined === p.path)
            {
                this.types[name] = type_default(require(name));
                p.path = name;
            }
            else
            {
                this.types[name] = type_default(require(p.path));
                this.types[name].system = p.system;
            }

            this.types[name].path = p.path;
        }

        return this.types[name];
    }

    static throw_storage_error(msg)
    {
        throw new storageError(msg);
    }

    flow_id(operation_id)
    {
        if(undefined === operation_id)
        {
            throw new storageError('undefined operation_id to flow_id');
        }

        return operation_id.toString().split('/')[0];
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
    
    /** flatten out the flow hierarchy. 
     * @param {object} json_flow The flow object 
     * @returns {object} {'flow': <the-original-flow>
            , 'operations' : array of operations
            , 'joins' : array of joins
            , 'parents' : object index of direct parents
            , 'joinsparents': object index of array of joins parents
        }
    */
    json_flow_to_storage_flow(json_flow)
    {
        const operations = [];
        const joins = [];

        let root = json_flow.root;

        if(null == root || root.type != 'START')
        {
            basestorage.throw_storage_error('INVALID ROOT OPERATION');
        }

        if(null == json_flow.id)
        {
            json_flow.id = newid();
        }

        flatten_tree(json_flow.id, root, operations, joins);
      
        dbg('OPERATIONS', JSON.stringify(operations, null, 4));

        const obj = index_opsparent_and_joins(operations, joins); 

        return Object.assign({}, {'flow': json_flow
            , 'operations' : operations
            , 'joins' : joins} , obj);
    
    }
    /** From an operations array rebuild all other storage objects
     * @param {object} operations array
     * @returns {object} a json flow object
     */
    storage_operations_to_storage_flow(operations)
    {
        const joins = operations.filter( el => {return 'JOIN' === el.type;});
        const obj = index_opsparent_and_joins(operations, joins); 

        const flow = Object.assign({}, {'operations' : operations
            , 'joins' : joins} , obj);

        return flow;
    }
    /** recreate a flow hierarchy from an array of operations
     * @param {object} operations array
     * @returns {object} a json flow object
    */ 
    storage_flow_to_json_flow(operations)
    {
        const root = operations.find( el => {return 'START' === el.type;});

        const flow = this.storage_operations_to_storage_flow(operations);
            
        construct_json_branch(root, flow);

        const keys = Object.keys(operation_default);

        operations.forEach(op => {

            delete op.children_id;
            delete op.id;
            
            //remove defaults
            keys.forEach( k => {
                if(undefined !== op[k] && op[k] === operation_default[k])
                    delete op[k];
            });

            delete op.processedjoin;

        });

        delete root.propertyBag;
        

        return {
            root: root
        };
         
    }
    
    
    get events(){ return STORAGEEVENT; }

    raiseEvent(storevent)
    {
        this.emit(storevent);
    }
}

module.exports = basestorage;

//export {basestorage, STORAGEEVENT}