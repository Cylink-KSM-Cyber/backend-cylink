import { Request, Response } from 'express';
const { check, validationResult, matchedData } = require('express-validator');

/**
 * Utility function to dynamically build field validation rules based on the fields array
 * 
 * Usage:
 * fieldValidationRules({
 *   fields: [
 *     {
 *       name: 'field_name',
 *       type: 'integer|signed_integer|string|text|image',
 *       optional: true|false, // optional, default is false
 *     },
 *     ...
 *   ],
 *   areRequired: true|false, // optional, default is true
 * });
 * 
 * @param {*} args 
 * @returns 
 */
const fieldValidationRules = (args: any) => {
  if (!args || !args.fields) {
    throw new Error('Expected fields property in argument');
  }

  const { fields, areRequired = true } = args;

  return [
    // Validation rules for fields
    ...fields.map((field: any) => {
      let validationChain = check(field.name);

      // Flag to know that a field is optional
      const isFieldOptional = field.optional || !areRequired;

      // Apply validation based on the type
      switch (field.type) {
        case 'integer':
          validationChain = validationChain
            .isInt({ min: 1 })
            .withMessage(`${field.name} is required and must be a positive integer.`);
          break;

        case 'signed_integer':
          validationChain = validationChain
            .isInt()
            .withMessage(`${field.name} is required and must be a signed integer.`);
          break;

        case 'string':
          validationChain = validationChain
            .isString()
            .trim()
            .notEmpty()
            .withMessage(`${field.name} is required. No data provided.`)
            .isLength({ max: 255 })
            .withMessage(`${field.name} must be no more than 255 characters.`);
          break;

        case 'text':
          validationChain = validationChain
            .isString()
            .trim()
            .notEmpty()
            .withMessage(`${field.name} is required. No data provided.`);
          break;

        case 'image':
          validationChain = validationChain
            .custom((value: any, { req }: any) => {
              const imageNotSpecified = !req.files || !req.files[field.name];

              // Skip-optional and not specified image
              if (isFieldOptional && imageNotSpecified) {
                return true;
              }

              // Ensure the image exists in the request
              if (imageNotSpecified) {
                throw new Error(`${field.name} is required.`);
              }

              // Extract the uploaded file object from req.files
              const image = req.files[field.name];

              // Check if the file is an image and has .webp extension
              if (!image.name.match(/\.(webp)$/)) {
                throw new Error('Image must be in webp format.');
              }

              // Check file size
              if (image.size > 10 * 1024 * 1024) {
                throw new Error('Image must be smaller than 10MB.');
              }

              return true;
            });
          break;

        default:
          break;
      }

      // Handle optional fields
      if (isFieldOptional && field.type !== 'image') {
        validationChain = validationChain.optional();
      }

      return validationChain;
    }),

    // Response middleware for validation errors
    (req: Request, res: Response, next: any) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 400, errors: errors.array() });
      }

      req.body = matchedData(req, { onlyValidData: true });
      next();
    },
  ];
};

module.exports = fieldValidationRules;
