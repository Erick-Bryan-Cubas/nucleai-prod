"""
Script para carregar arquivos Parquet no banco de dados Oracle
"""

import os
import pandas as pd
import oracledb
from dotenv import load_dotenv
from pathlib import Path

# Carregar variáveis de ambiente
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Configurações do Oracle
ORACLE_CONFIG = {
    'host': os.getenv('HOST_ORACLE'),
    'port': int(os.getenv('PORT_ORACLE', 1521)),
    'sid': os.getenv('SID_ORACLE'),
    'user': os.getenv('USER_ORACLE'),
    'password': os.getenv('PASSWORD_ORACLE')
}

# Caminho dos arquivos Parquet
GOLD_PATH = Path(__file__).parent.parent / 'docker' / 'data' / 'gold'

def get_oracle_connection():
    """Estabelece conexão com o Oracle"""
    dsn = oracledb.makedsn(
        ORACLE_CONFIG['host'],
        ORACLE_CONFIG['port'],
        sid=ORACLE_CONFIG['sid']
    )
    
    connection = oracledb.connect(
        user=ORACLE_CONFIG['user'],
        password=ORACLE_CONFIG['password'],
        dsn=dsn
    )
    print(f"✓ Conectado ao Oracle: {ORACLE_CONFIG['host']}:{ORACLE_CONFIG['port']}/{ORACLE_CONFIG['sid']}")
    return connection

def get_oracle_type(dtype, col_name, df):
    """Mapeia tipos pandas para tipos Oracle"""
    dtype_str = str(dtype)
    
    if 'datetime' in dtype_str:
        return 'DATE'
    elif 'float' in dtype_str:
        return 'NUMBER(18,6)'
    elif 'int' in dtype_str:
        return 'NUMBER(18)'
    elif 'object' in dtype_str:
        # Calcular tamanho máximo da coluna string
        max_len = df[col_name].astype(str).str.len().max()
        max_len = max(50, int(max_len * 1.5))  # Margem de segurança
        max_len = min(max_len, 4000)  # Limite Oracle VARCHAR2
        return f'VARCHAR2({max_len})'
    else:
        return 'VARCHAR2(255)'

def create_table_ddl(table_name, df):
    """Gera DDL para criar tabela no Oracle"""
    columns = []
    for col in df.columns:
        oracle_type = get_oracle_type(df[col].dtype, col, df)
        # Sanitizar nome da coluna (Oracle não aceita alguns caracteres)
        col_safe = col.upper().replace(' ', '_')
        columns.append(f'    {col_safe} {oracle_type}')
    
    ddl = f"CREATE TABLE {table_name} (\n"
    ddl += ",\n".join(columns)
    ddl += "\n)"
    
    return ddl

def drop_table_if_exists(cursor, table_name):
    """Remove tabela se existir"""
    try:
        cursor.execute(f"DROP TABLE {table_name} PURGE")
        print(f"  → Tabela {table_name} removida (existia anteriormente)")
    except oracledb.DatabaseError as e:
        error, = e.args
        if error.code == 942:  # Table does not exist
            pass
        else:
            raise

def load_dataframe_to_oracle(connection, df, table_name):
    """Carrega um DataFrame no Oracle"""
    cursor = connection.cursor()
    
    print(f"\n📊 Processando: {table_name}")
    print(f"   Linhas: {len(df):,} | Colunas: {len(df.columns)}")
    
    # Remover tabela se existir
    drop_table_if_exists(cursor, table_name)
    
    # Criar tabela
    ddl = create_table_ddl(table_name, df)
    print(f"  → Criando tabela...")
    cursor.execute(ddl)
    
    # Preparar dados para inserção
    # Converter colunas para formato compatível com Oracle
    df_copy = df.copy()
    
    # Substituir NaN por None (NULL no Oracle)
    df_copy = df_copy.where(pd.notna(df_copy), None)
    
    for col in df_copy.columns:
        if 'datetime' in str(df[col].dtype):  # Usar dtype original
            df_copy[col] = df_copy[col].apply(
                lambda x: x.to_pydatetime() if x is not None and pd.notna(x) else None
            )
        elif df[col].dtype == 'object':
            df_copy[col] = df_copy[col].apply(
                lambda x: str(x) if x is not None else None
            )
        # Para colunas numéricas, manter None como está (será NULL no Oracle)
    
    # Gerar INSERT statement
    col_names = [c.upper().replace(' ', '_') for c in df.columns]
    placeholders = ', '.join([f':{i+1}' for i in range(len(col_names))])
    insert_sql = f"INSERT INTO {table_name} ({', '.join(col_names)}) VALUES ({placeholders})"
    
    # Inserir dados em lotes
    batch_size = 500
    total_rows = len(df_copy)
    rows_inserted = 0
    
    print(f"  → Inserindo dados...")
    
    for start in range(0, total_rows, batch_size):
        end = min(start + batch_size, total_rows)
        batch = df_copy.iloc[start:end]
        
        # Converter para lista de tuplas, tratando NaN
        data = []
        for _, row in batch.iterrows():
            row_data = []
            for val in row.values:
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    row_data.append(None)
                else:
                    row_data.append(val)
            data.append(tuple(row_data))
        
        cursor.executemany(insert_sql, data)
        rows_inserted += len(data)
        
        # Mostrar progresso
        progress = (rows_inserted / total_rows) * 100
        print(f"     Progresso: {rows_inserted:,}/{total_rows:,} ({progress:.1f}%)", end='\r')
    
    connection.commit()
    print(f"  ✓ {rows_inserted:,} linhas inseridas com sucesso!          ")
    
    cursor.close()

def main():
    print("=" * 60)
    print("  CARREGAMENTO DE PARQUET PARA ORACLE")
    print("=" * 60)
    
    # Arquivos a processar
    parquet_files = {
        'AUXILIAR_PROCESSADO': GOLD_PATH / 'auxiliar_processado.parquet',
        'BOLETOS_PROCESSADO': GOLD_PATH / 'boletos_processado.parquet',
        'BRIDGE_CNPJ': GOLD_PATH / 'bridge_cnpj.parquet'
    }
    
    # Verificar arquivos
    print("\n📁 Verificando arquivos...")
    for name, path in parquet_files.items():
        if path.exists():
            print(f"  ✓ {name}: {path}")
        else:
            print(f"  ✗ {name}: Arquivo não encontrado!")
            return
    
    # Conectar ao Oracle
    print("\n🔌 Conectando ao Oracle...")
    try:
        connection = get_oracle_connection()
    except Exception as e:
        print(f"  ✗ Erro ao conectar: {e}")
        return
    
    # Carregar cada arquivo
    try:
        for table_name, file_path in parquet_files.items():
            df = pd.read_parquet(file_path)
            load_dataframe_to_oracle(connection, df, table_name)
        
        print("\n" + "=" * 60)
        print("  ✅ CARREGAMENTO CONCLUÍDO COM SUCESSO!")
        print("=" * 60)
        
        # Verificar contagem final
        print("\n📋 Verificação final:")
        cursor = connection.cursor()
        for table_name in parquet_files.keys():
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"   {table_name}: {count:,} registros")
        cursor.close()
        
    except Exception as e:
        print(f"\n❌ Erro durante o carregamento: {e}")
        import traceback
        traceback.print_exc()
    finally:
        connection.close()
        print("\n🔌 Conexão encerrada.")

if __name__ == '__main__':
    main()
