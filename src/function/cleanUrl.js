const Joi = require('joi');

const schema = Joi.object({
    url: Joi.string().required(),
});

function processUrl(data) {
    const { error, value } = schema.validate(data);

    if (error) {
        throw new Error(error.details[0].message);
    }

    const sanitizedData = {
        url: value.url.replace(/<(?:.|\n)*?>/gm, ''),
    };

    return sanitizedData;
}
module.exports = processUrl; 