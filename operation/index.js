
class Operation
{
    constructor(id, name, config, type)
    {
        this.id = id;
        this.name = name;
        this.config = config;
        this.type = type;

        this.asof = null;
        this.parent = null;

        this.result = null;
        this.completed = false;
        this.successed = false;

        this.history = null;

        this.modified = this.created = Date.now();

        this.propertybag = null;
    }
}

class Flow
{
    constructor(id)
    {
        this.id = id;
        this.tail = null;
    }

    addOp(op)
    {
        if(null == this.tail)
        {
            this.tail = op;
            return;
        }
        else
        {
            let parent = this.tail;
            op.parent = parent;
            this.tail = op;
        }
    }
}

module.exports = {Operation, Flow};