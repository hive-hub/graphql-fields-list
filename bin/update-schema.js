"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const graphql_1 = require("graphql");
const schema_1 = require("../test/mocks/schema");
const schemaPath = path.resolve(__dirname, '../test/mocks/schema.graphql');
fs.writeFileSync(schemaPath, graphql_1.printSchema(schema_1.schema));
console.log('Done!');
//# sourceMappingURL=update-schema.js.map