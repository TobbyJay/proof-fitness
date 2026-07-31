import { validateProgrammeDomain } from '../src/domain/validateProgrammeDomain.js';

const result = validateProgrammeDomain();
for (const warning of result.warnings) console.warn(`Programme warning: ${warning}`);
console.log(`Programme domain verified: ${result.exerciseCount} exercises, ${result.templateCount} required workout templates.`);
