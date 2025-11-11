// main.ts provides a small executable harness that validates hazo_connect integration using config.ini and .env.local.
import path from 'path'
import { HazoConfig } from 'hazo_config'
import { createHazoConnect, QueryBuilder, noOpLogger } from 'hazo_connect/server'

// build_config_provider loads the INI configuration using hazo_config.
function build_config_provider() {
  const config_path = path.resolve(process.cwd(), 'config.ini')
  return new HazoConfig({
    filePath: config_path,
    logger: noOpLogger
  })
}

// run_demo constructs a PostgREST adapter and logs the sanitized configuration details.
async function run_demo() {
  const config_provider = build_config_provider()

  const connector = createHazoConnect({
    type: 'postgrest',
    logger: noOpLogger,
    configProvider: config_provider
  })

  const adapter_config = await connector.getConfig()

  const builder = new QueryBuilder()
    .from('example_table')
    .select('*')
    .limit(1)

  console.log('Sanitized adapter configuration', {
    base_url: adapter_config.base_url,
    has_api_key: Boolean(adapter_config.api_key)
  })

  console.log('Sample query structure', {
    table: builder.getTable(),
    select_fields: builder.getSelectFields(),
    limit: builder.getLimit()
  })
}

// Execute the demo and surface any errors to the console.
run_demo().catch((error) => {
  console.error('Test application encountered an error', error)
  process.exitCode = 1
})

