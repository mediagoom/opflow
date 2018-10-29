[![Build Status](https://travis-ci.org/mediagoom/opflow.svg?branch=master)](https://travis-ci.org/mediagoom/opflow) [![Win Build Status](https://ci.appveyor.com/api/projects/status/github/mediagoom/opflow?branch=master&svg=true)](https://ci.appveyor.com/project/aseduto/opflow) [![Coverage Status](https://coveralls.io/repos/github/mediagoom/opflow/badge.svg?branch=master)](https://coveralls.io/github/mediagoom/opflow?branch=master)

# opflow

opflow is a operation flow framework for nodejs.
Its main aim is to provide a series of operations described in a json flow.
opflow will take the described flow and run it in a reliable way.

### Flow Control

opflow, at the moment, provide the following flow control operators:

- START: should always be the first operation in the flow
- END: should always be the last operation in the flow
- IF (*coming soon*): will split the flow in two branch and run only one of them
- JOIN: this allow to join different branches in your flow. Join is the only operations which can have more than one parent.

                    START
                    /   \
                   /     \
                  /       \
                 /         \
                /           \
              DO            DO
            SOMETHING    SOMETHING 
                \         ELSE IN 
                 \        PARALLEL
                  \         /
                   \       /
                    \     /
                     \   /
                     JOIN
                      |
                      |
                     END

## Why opflow

A lot of time when programming you need to keep several operations together to have *consistency*. In a classic monolithic world you would ACID transaction in order to achieve *consistency*.
Fast forward several years and you land in a Microservices world where you need hyper scalability. To reach this level of scalability you no longer can rely on a *central transactional database*. Instead you have to segregate your data and operations and rely on *eventually consistent*.
opflow let you describe all your operation and run them with retries in case of failure and storage recovery in case of fault.
The simplest example would be a system which manage orders and clients with different microservices. When an Order arrives for a new Client the system need to create both the client and the order. 
If your code handle this in memory and the code get interrupted without completing either one of the operations the system will be *forever inconsistent*. The failure could simple derive from an hardware failure, does not have to be a software fault.

In the Client and Order above example opflow would try several times (you say how many) both operations. It would track everything in a storage. If the system should shutdown when it comes backup opflow will resume trying.

## How to use opflow

### Install

```
npm i @mediagoom/opflow
```

### Write Code
```javascript

const opflow = require('@mediagoom/opflow');

opflow.start()

const flow_id = await opflow.add_flow(your_flow);


```

### Unit Testing
When you use opflow you may want to clearly divide the testing of your flow logic from the real flow running.
Since opflow is specifically design to isolate your code from external problem you should run the full flow in integration testing.

In order to unit test the logic and design of your flow you can write the json structure of your flow and assign as operation type one of *code, echo or NULL*.

For instance let say you have a *read_file* operation. When full running the application you would define the operations as:
```javascript
....
  children : { type : 'read_file', name : 'read a file', config : {path : '<file path to read>'}, children : ... }
```

In unit test you may define your operation as:
```javascript
....
  children : { type : 'code', name : 'read a file', config : {path : '<file path to read>', code : '"<the mock of your file content>"'} children : ... }
```

With your *read_file* operation mocked as above you can define your unit test as:

```javascript
const chai   = require('chai');
const flows  = require('<your unit test flows definitions');

const expect = chai.expect;
const unitTest = require('@mediagoom/opflow/unit-test');

describe('UNIT-TEST TESTING', () => {
    
    const keys = Object.keys(flows);

    for(let idx = 0; idx < keys.length; idx++)
    {
        const key = keys[idx];

        it('should run unit test for flow ' + key , async () => {
            
            const operations = await unitTest(flows[key]);

            const end = operations.find ( (el) => {return el.type === 'END';} );

            expect(end.completed).to.be.true;
        });
    }
});

```

### Integration Testing

For integration testing just switch the type of the above operation from *code* to *read_file*.

## opflow Operations

### Builtin Operations

### Adding New Operations

## How to scale opflow

## Projects using opflow







