-- WrenAI DuckDB Initialization SQL
-- Este SQL cria views para acessar os arquivos Parquet e CSV
-- IMPORTANTE: O wren-engine usa /usr/src/app/data como caminho base

-- GOLD: Views apontando para os Parquet processados
CREATE OR REPLACE VIEW auxiliar_processado AS
SELECT * FROM read_parquet('/usr/src/app/data/gold/auxiliar_processado.parquet');

CREATE OR REPLACE VIEW boletos_processado AS
SELECT * FROM read_parquet('/usr/src/app/data/gold/boletos_processado.parquet');

CREATE OR REPLACE VIEW bridge_cnpj AS
SELECT * FROM read_parquet('/usr/src/app/data/gold/bridge_cnpj.parquet');