

[![Win Build Status](https://ci.appveyor.com/api/projects/status/github/mediagoom/opflow?branch=master&svg=true)](https://ci.appveyor.com/project/aseduto/opflow)

# opflow

opflow is a operation flow framework for nodejs.

It main aim is to provide a series of operations described in json flow.

opflow will take the described flow and run it in a reliable way.

## Flow Control

opflow, at the moment, provide the following flow control operators:

    - START: should always be the first operation in the flow
    - END: should always be the last operation in the flow
    - IF: will split the flow in two branch and run only one of them
    - JOIN: this allow to join differents branches in your flow. Join is the only operations which can have more than one parent.


