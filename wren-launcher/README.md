## Como compilar
```bash
# mac
go build main.go
# windows
env GOOS=windows GOARCH=amd64 go build main.go
```

## Qualidade de codigo
```bash
make check  # Executa todas as verificacoes (fmt, vet, lint)
make test   # Executa testes
make fmt    # Formata o codigo
make vet    # Executa go vet
make lint   # Executa golangci-lint
```

## Integracao continua

Este projeto usa GitHub Actions para CI/CD. O workflow roda automaticamente em:

- **Push na branch main**: executa todas as verificacoes e testes
- **Pull Request com label `launcher`**: executa verificacoes e testes quando o PR recebe esse label
- **Disparo manual**: pode ser executado manualmente pela interface do GitHub Actions

### Jobs de CI

1. **Lint e Testes**
   - Verificacao de formatacao
   - Analise com go vet
   - Checagens do golangci-lint
   - Testes unitarios
   - Verificacoes gerais de qualidade

2. **Varredura de seguranca**
   - Analise de seguranca com Gosec
   - Verificacao de modulos Go

## Como atualizar dependencias

```bash
# Atualizar uma dependencia especifica
go get example.com/some/package@latest

# Atualizar todas as dependencias
go get -u ./...

# Limpar e garantir consistencia dos arquivos de modulo
go mod tidy

# Verificar as atualizacoes
go test ./...

```
