[![Build Status](https://travis-ci.org/mediagoom/opflow.svg?branch=master)](https://travis-ci.org/mediagoom/opflow) [![Win Build Status](https://ci.appveyor.com/api/projects/status/github/mediagoom/opflow?branch=master&svg=true)](https://ci.appveyor.com/project/aseduto/opflow) [![Coverage Status](https://coveralls.io/repos/github/mediagoom/opflow/badge.svg?branch=master)](https://coveralls.io/github/mediagoom/opflow?branch=master)

# opflow

opflow is a operation flow framework for nodejs.
Its main aim is to provide a series of operations described in a json flow.
opflow will take the described flow and run it in a reliable way.

### Flow Control

opflow, at the moment, provide the following flow control operators:

- START: should always be the first operation in the flow
- END: should always be the last operation in the flow
- IF (*todo*): will split the flow in two branch and run only one of them
- JOIN: this allow to join different branches in your flow. Join is the only operations which can have more than one parent.

        START
        /   \
        /     \
      /       \
      DO       DO
  SOMETHING  SOMETHING ELSE IN PARALLEL
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
```

```

## opflow Operations

### Builtin Operations

### Adding New Operations

## How to scale opflow

## Projects using opflow







