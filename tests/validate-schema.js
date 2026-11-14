/* 用 JSON Schema 驗證 data/events.json（需要 ajv）
 * 執行：node tests/validate-schema.js
 */
const Ajv2020 = require('ajv/dist/2020');
const schema = require('../data/events.schema.json');
const data = require('../data/events.json');

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
if (validate(data)) {
  console.log(`✅ Schema 驗證通過（schema v${data.schemaVersion}、${data.chains.length} 條鏈）`);
} else {
  console.error('❌ Schema 驗證失敗：');
  for (const e of validate.errors.slice(0, 20)) console.error(`  ${e.instancePath || '/'} ${e.message}`);
  process.exit(1);
}
