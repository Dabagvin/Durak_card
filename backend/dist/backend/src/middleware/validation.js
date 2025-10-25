"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = validateSchema;
const zod_1 = require("zod");
function validateSchema(schema, data) {
    try {
        return { success: true, data: schema.parse(data) };
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return {
                success: false,
                errors: error.issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                    code: e.code,
                })),
            };
        }
        return {
            success: false,
            errors: [{ message: 'Unknown validation error' }],
        };
    }
}
