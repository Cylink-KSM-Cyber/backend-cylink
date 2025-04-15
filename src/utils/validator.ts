import { Request, Response } from 'express';

const { check, query, validationResult, matchedData } = require('express-validator');

/**
 * Utility function to dynamically build field validation rules based on the fields array
 *
 * Usage:
 * fieldValidationRules({
 *   fields: [ // For validating request body fields
 *     {
 *       name: 'field_name',
 *       type: 'integer|signed_integer|string|text|image|number',
 *       optional: true|false, // optional, default is false
 *     },
 *     ...
 *   ],
 *   query: [ // For validating query parameters
 *     {
 *       name: 'param_name',
 *       type: 'integer|signed_integer|string|text|number',
 *       required: true|false, // default is false for query params
 *       enum: ['value1', 'value2'] // optional, restricts to specific values
 *     },
 *     ...
 *   ],
 *   areRequired: true|false, // optional, default is true (for body fields)
 *   preserveBodyProps: true|false, // optional, default is false - if true, keeps existing req.body properties
 * });
 *
 * @param {Object} args - Arguments for configuring validation
 * @returns {Array} Middleware functions for validation
 */
const fieldValidationRules = (args: any) => {
  // Ensure at least one validation type is provided
  if (!args || (!args.fields && !args.query)) {
    throw new Error('Expected fields or query property in argument');
  }

  const {
    fields = [],
    query: queryParams = [],
    areRequired = true,
    preserveBodyProps = false,
  } = args;
  const validationRules = [];

  // Process body field validations
  if (fields.length > 0) {
    fields.forEach((field: any) => {
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
        case 'number':
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
          validationChain = validationChain.custom((value: any, { req }: any) => {
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

      // Handle minimum length
      if (field.min) {
        validationChain = validationChain
          .isLength({ min: field.min })
          .withMessage(`${field.name} must be no less than ${field.min} characters.`);
      }

      // Handle email type
      if (field.isEmail) {
        validationChain = validationChain.isEmail().normalizeEmail();
      }

      validationRules.push(validationChain);
    });
  }

  // Process query parameter validations
  if (queryParams.length > 0) {
    queryParams.forEach((param: any) => {
      let validationChain = query(param.name);

      // Query parameters are optional by default unless specified
      const isRequired = param.required === true;

      // Apply validation based on the type
      switch (param.type) {
        case 'integer':
          validationChain = validationChain
            .optional({ nullable: true, checkFalsy: true })
            .isInt({ min: 1 })
            .withMessage(`${param.name} must be a positive integer.`);
          break;

        case 'signed_integer':
        case 'number':
          validationChain = validationChain
            .optional({ nullable: true, checkFalsy: true })
            .isInt()
            .withMessage(`${param.name} must be an integer.`);
          break;

        case 'string':
          validationChain = validationChain
            .optional({ nullable: true, checkFalsy: true })
            .isString()
            .trim()
            .isLength({ max: 255 })
            .withMessage(`${param.name} must be no more than 255 characters.`);
          break;

        case 'text':
          validationChain = validationChain
            .optional({ nullable: true, checkFalsy: true })
            .isString()
            .trim();
          break;

        default:
          validationChain = validationChain.optional({
            nullable: true,
            checkFalsy: true,
          });
          break;
      }

      // Make required if specified
      if (isRequired) {
        validationChain = validationChain.exists().withMessage(`${param.name} is required.`);
      }

      // Handle enum values if specified
      if (param.enum && Array.isArray(param.enum)) {
        validationChain = validationChain
          .optional({ nullable: true, checkFalsy: true })
          .isIn(param.enum)
          .withMessage(`${param.name} must be one of: ${param.enum.join(', ')}`);
      }

      validationRules.push(validationChain);
    });
  }

  // Add response middleware for validation errors
  validationRules.push((req: Request, res: Response, next: any) => {
    // Store existing req.body properties if preserveBodyProps is true
    const existingBodyProps = preserveBodyProps ? { ...req.body } : {};

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().reduce((acc: any, error: any) => {
        if (acc[error.param]) {
          acc[error.param].push(error.msg);
        } else {
          acc[error.param] = [error.msg];
        }
        return acc;
      }, {});

      return res.status(400).json({
        status: 400,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    // Only populate validated data for body if there are field validations
    if (fields.length > 0) {
      // Get validated body data
      const validatedBody = matchedData(req, { onlyValidData: true, locations: ['body'] });

      if (preserveBodyProps) {
        // Merge validated body with existing body props, prioritizing validated data
        req.body = { ...existingBodyProps, ...validatedBody };
      } else {
        // Save user ID before overwriting req.body
        const userId = req.body.id;

        // Use only validated data
        req.body = validatedBody;

        // Restore user ID if it existed
        if (userId !== undefined) {
          req.body.id = userId;
        }
      }
    }

    next();
  });

  return validationRules;
};

module.exports = fieldValidationRules;
