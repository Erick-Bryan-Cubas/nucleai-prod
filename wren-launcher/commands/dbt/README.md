# Requisitos para projeto DBT
Esta secao descreve requisitos para o projeto dbt de destino:
- Garanta que o projeto DBT esteja valido e gere os arquivos obrigatorios:
  - `catalog.json`
  - `manifest.json`
	Execute os seguintes comandos:
	```
	dbt build
	dbt docs generate
	```
- Prepare o profile do projeto dbt com as informacoes de conexao do seu banco.
  - `profiles.yml`


# Como suportar uma nova fonte de dados

Este documento descreve os passos necessarios para adicionar suporte a uma nova fonte de dados no conversor de projeto dbt.
A fonte de dados alvo deve ser suportada por dbt e pelo Wren engine:
- [dbt supported databases](https://docs.getdbt.com/docs/supported-data-platforms)
- [Wren engine supported data sources](https://docs.getwren.ai/oss/wren_engine_api#tag/AthenaConnectionInfo)

## 1. Implementar a interface DataSource

O primeiro passo e definir uma nova struct para sua fonte de dados e implementar a interface `DataSource` definida em `data_source.go`.

A interface `DataSource` e:

```go
type DataSource interface {
    GetType() string
    Validate() error
    MapType(sourceType string) string
}
```

### Passos

1.  **Defina sua struct**: crie uma nova struct que represente as propriedades de conexao da sua fonte de dados. Os campos devem corresponder ao que esta definido na [documentacao da API do Wren engine](https://docs.getwren.ai/oss/wren_engine_api#tag/SnowflakeConnectionInfo) para a fonte de dados alvo.

	Por exemplo, para adicionar suporte a `Snowflake`, voce pode definir:

    ```go
    type WrenSnowflakeDataSource struct {
        Account   string `json:"account"`
        User      string `json:"user"`
        Password  string `json:"password"`
        Database  string `json:"database"`
        Warehouse string `json:"warehouse"`
        // ... other properties
    }
    ```

2.  **Implemente `GetType()`**: esse metodo deve retornar uma string que identifica o tipo da fonte (ex.: `"snowflake"`).

3.  **Implemente `Validate()`**: esse metodo deve verificar se propriedades essenciais da fonte estao definidas e validas. Retorne erro se a validacao falhar.

4.  **Implemente `MapType()`**: esse metodo e essencial para mapear tipos da fonte (como definidos em `catalog.json`) para tipos suportados pelo Wren (ex.: `integer`, `varchar`, `timestamp`).

## 2. Adicionar logica de conversao em `data_source.go`

Apos implementar a interface, integre a nova fonte na logica de conversao. Isso e feito atualizando a funcao `convertConnectionToDataSource` em `data_source.go`.

Adicione um novo `case` no `switch` que corresponda ao campo `type` do `profiles.yml` do dbt. Esse novo `case` sera responsavel por criar uma instancia da sua nova struct a partir dos detalhes de conexao do dbt.

### Exemplo

```go
// in data_source.go

func convertConnectionToDataSource(conn DbtConnection, dbtHomePath, profileName, outputName string) (DataSource, error) {
	switch strings.ToLower(conn.Type) {
	case "postgres", "postgresql":
		return convertToPostgresDataSource(conn)
	case "duckdb":
		return convertToLocalFileDataSource(conn, dbtHomePath)
    // Adicione seu novo case aqui
	case "snowflake":
		return convertToSnowflakeDataSource(conn) // Implemente esta funcao
	default:
		// ...
	}
}

// Implemente a funcao de conversao
func convertToSnowflakeDataSource(conn DbtConnection) (*WrenSnowflakeDataSource, error) {
    // Logica para extrair propriedades de snowflake de conn
    // e retornar um novo *WrenSnowflakeDataSource
}
```

## 3. Tratar a nova fonte em `ConvertDbtProjectCore`

A funcao `ConvertDbtProjectCore` em `converter.go` e responsavel por gerar o arquivo `wren-datasource.json`. Voce deve adicionar a nova fonte no `switch` dessa funcao para garantir serializacao correta.

### Passos

1.  **Localize o `switch`**: encontre o bloco `switch typedDS := ds.(type)` dentro de `ConvertDbtProjectCore`.
2.  **Adicione um novo `case`**: adicione um `case` para sua struct de fonte de dados. Dentro dele, monte o mapa `wrenDataSource` com `type` e `properties` corretos.

### Exemplo

```go
// in converter.go's ConvertDbtProjectCore function

// ...
			switch typedDS := ds.(type) {
			case *WrenPostgresDataSource:
				// ...
			case *WrenLocalFileDataSource:
				// ...
			// Adicione seu novo case aqui
			case *WrenSnowflakeDataSource:
				wrenDataSource = map[string]interface{}{
					"type": "snowflake",
					"properties": map[string]interface{}{
						"account":  typedDS.Account,
						"user":     typedDS.User,
						"password": typedDS.Password,
						"database": typedDS.Database,
                        "warehouse": typedDS.Warehouse,
						// ... other properties
					},
				}
			default:
				// ...
			}
// ...
```
**Observacao sobre fontes baseadas em arquivo**: se sua fonte de dados for baseada em arquivos (como `duckdb`), voce tambem precisa adicionar logica para definir corretamente a variavel `localStoragePath` dentro de `ConvertDbtProjectCore`. Esse caminho informa ao Wren engine onde encontrar os arquivos de dados.
