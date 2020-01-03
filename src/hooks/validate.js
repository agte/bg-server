const Ajv = require('ajv');
const { validateSchema } = require('feathers-hooks-common');

const ajv = new Ajv({ allErrors: true });

module.exports = (schema) => (context) => validateSchema(schema, ajv)(context);
