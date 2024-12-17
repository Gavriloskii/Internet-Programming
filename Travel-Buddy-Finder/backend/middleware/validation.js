const { AppError } = require('./errorHandler');
const validator = require('validator');

// Validation middleware factory
const createValidation = (schema) => {
    return (req, res, next) => {
        const validationErrors = [];

        Object.keys(schema).forEach(field => {
            const value = req.body[field];
            const rules = schema[field];

            if (rules.required && !value) {
                validationErrors.push(`${field} is required`);
                return;
            }

            if (value) {
                if (rules.type === 'email' && !validator.isEmail(value)) {
                    validationErrors.push(`${field} must be a valid email`);
                }

                if (rules.minLength && value.length < rules.minLength) {
                    validationErrors.push(`${field} must be at least ${rules.minLength} characters long`);
                }

                if (rules.maxLength && value.length > rules.maxLength) {
                    validationErrors.push(`${field} must not exceed ${rules.maxLength} characters`);
                }

                if (rules.enum && !rules.enum.includes(value)) {
                    validationErrors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
                }

                if (rules.match && !rules.match.test(value)) {
                    validationErrors.push(`${field} format is invalid`);
                }

                if (rules.custom) {
                    const customError = rules.custom(value);
                    if (customError) validationErrors.push(customError);
                }
            }
        });

        if (validationErrors.length > 0) {
            return next(new AppError(validationErrors.join('. '), 400));
        }

        next();
    };
};

// Predefined validation schemas
const schemas = {
    registration: {
        name: {
            required: true,
            minLength: 2,
            maxLength: 50,
            match: /^[a-zA-Z\s-']+$/
        },
        email: {
            required: true,
            type: 'email'
        },
        password: {
            required: true,
            minLength: 8,
            custom: (value) => {
                if (!/\d/.test(value)) return 'Password must contain at least one number';
                if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
                if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
                if (!/[!@#$%^&*]/.test(value)) return 'Password must contain at least one special character';
                return null;
            }
        }
    },
    login: {
        email: {
            required: true,
            type: 'email'
        },
        password: {
            required: true
        }
    },
    updateProfile: {
        name: {
            minLength: 2,
            maxLength: 50,
            match: /^[a-zA-Z\s-']+$/
        },
        personalityType: {
            enum: ['adventurer', 'planner', 'flexible', 'relaxed', 'cultural']
        },
        'travelPreferences.budget': {
            enum: ['budget', 'moderate', 'luxury']
        },
        'travelPreferences.pace': {
            enum: ['slow', 'moderate', 'fast']
        },
        'travelPreferences.interests': {
            custom: (value) => {
                if (!Array.isArray(value)) return 'Interests must be an array';
                const validInterests = [
                    'nature', 'culture', 'food', 'adventure', 'history',
                    'photography', 'nightlife', 'shopping', 'art', 'sports'
                ];
                const invalid = value.find(interest => !validInterests.includes(interest));
                if (invalid) return `Invalid interest: ${invalid}`;
                return null;
            }
        }
    },
    updatePassword: {
        currentPassword: {
            required: true
        },
        newPassword: {
            required: true,
            minLength: 8,
            custom: (value) => {
                if (!/\d/.test(value)) return 'Password must contain at least one number';
                if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
                if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
                if (!/[!@#$%^&*]/.test(value)) return 'Password must contain at least one special character';
                return null;
            }
        },
        confirmPassword: {
            required: true,
            custom: (value, body) => {
                if (value !== body.newPassword) return 'Passwords do not match';
                return null;
            }
        }
    },
    createJournal: {
        title: {
            required: true,
            minLength: 3,
            maxLength: 100
        },
        content: {
            required: true,
            minLength: 10,
            maxLength: 5000
        },
        location: {
            required: true,
            minLength: 2,
            maxLength: 100
        }
    }
};

// Export validation middlewares
module.exports = {
    validateRegistration: createValidation(schemas.registration),
    validateLogin: createValidation(schemas.login),
    validateUpdateProfile: createValidation(schemas.updateProfile),
    validateUpdatePassword: createValidation(schemas.updatePassword),
    validateCreateJournal: createValidation(schemas.createJournal),
    createValidation // Export factory function for custom schemas
};
