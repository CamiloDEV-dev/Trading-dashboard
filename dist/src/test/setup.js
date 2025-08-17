"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dotenv_1 = __importDefault(require("dotenv"));
(0, vitest_1.beforeAll)(() => {
    // Load environment variables for testing
    dotenv_1.default.config({ path: '.env.test' });
    // Set default test environment variables if not provided
    if (!process.env.SUPABASE_URL) {
        process.env.SUPABASE_URL = 'https://test.supabase.co';
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    }
});
