## Como rodar testes e2e localmente

1. Garanta que todos os servicos do Wren AI estejam iniciados. ([Como iniciar](https://github.com/Canner/WrenAI/blob/main/docker/README.md#how-to-start))

2. Crie um arquivo `e2e.config.json` na pasta `wren-ui/e2e` e substitua os valores das fontes de dados necessarias em `./config.ts`.

   ```ts
  // Substitua a configuracao padrao pelos seus valores em e2e.config.json
   const defaultTestConfig = {
     bigQuery: {
       projectId: 'wrenai',
       datasetId: 'wrenai.tpch_sf1',
      // O arquivo de credencial deve ficar dentro da pasta "wren-ui"
      // Exemplo: .tmp/credential.json
       credentialPath: 'bigquery-credential-path',
     },
     duckDb: {
       sqlCsvPath: 'https://duckdb.org/data/flights.csv',
     },
     postgreSql: {
       host: 'postgresql-host',
       port: '5432',
       username: 'postgresql-username',
       password: 'postgresql-password',
       database: 'postgresql-database',
       ssl: false,
     },
     mysql: {
       host: 'mysql-host',
       port: '3306',
       username: 'mysql-username',
       password: 'mysql-password',
       database: 'mysql-database',
     },
     sqlServer: {
       host: 'sqlServer-host',
       port: '1433',
       username: 'sqlServer-username',
       password: 'sqlServer-password',
       database: 'sqlServer-database',
     },
     trino: {
       host: 'trino-host',
       port: '8081',
       catalog: 'trino-catalog',
       schema: 'trino-schema',
       username: 'trino-username',
       password: 'trino-password',
     },
   };
   ```

3. Faca o build da UI antes de iniciar o servidor e2e

   ```bash
   yarn build
   ```

  > Garanta que a porta 3000 esteja disponivel para os testes E2E. O AI service precisa de WREN_UI_ENDPOINT para conectar nessa porta e gerar resultados confiaveis.

4. Rode os testes

   ```bash
   yarn test:e2e
   ```

  Rodar teste com navegador aberto

   ```bash
   yarn test:e2e --headed
   ```

## Como desenvolver

- Escrever testes com modo de UI interativo

  ```bash
  yarn test:e2e --ui
  ```

- Escrever testes com modo debug

  ```bash
  yarn test:e2e --debug
  ```

- Gerar scripts de teste

  ```
  npx playwright codegen http://localhost:3000
  ```
