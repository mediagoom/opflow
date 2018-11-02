

/**
 * Make a serializable error object.
 *
 * To create serializable errors you must re-set message so
 * that it is enumerable and you must re configure the type
 * property so that is writable and enumerable.
 *
 * @param {number} status
 * @param {string} message
 * @param {string} type
 * @param {object} props
 * @private
 */
function createError (status, message, type, props) {
    var error = new Error();

    // capture stack trace
    Error.captureStackTrace(error, createError);

    // set free-form properties
    for (var prop in props) {
        error[prop] = props[prop];
    }

    // set message
    error.message = message;

    // set status
    error.status = status;
    error.statusCode = status;

    // set type
    Object.defineProperty(error, 'type', {
        value: type
        ,enumerable: true
        ,writable: true
        ,configurable: true
    });

    return error;
}

module.exports = createError;