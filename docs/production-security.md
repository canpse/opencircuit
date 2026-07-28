# Segurança e implantação

## Modos de identidade

### Sessão anônima assinada

É o padrão e serve para uso local, laboratório ou uma aplicação sem contas. O servidor cria um
owner aleatório, assina o valor com HMAC e o grava em cookie `HttpOnly`, `SameSite=Lax`. Alterar o
cookie invalida a assinatura e cria uma nova identidade; o navegador não pode escolher o owner.

O segredo é lido de `OPENCIRCUIT_SESSION_SECRET`. Sem essa variável, um segredo aleatório é
persistido no arquivo configurado por `OPENCIRCUIT_SESSION_SECRET_FILE` ou em `session-secret` ao
lado do banco. O arquivo e o banco precisam estar em volume persistente.

Esse modo não oferece login, recuperação de conta nem sincronização entre dispositivos.

### Proxy de autenticação

Para contas reais, configure:

```text
OPENCIRCUIT_IDENTITY_MODE=trusted-proxy
OPENCIRCUIT_AUTH_HEADER=x-authenticated-user
OPENCIRCUIT_SESSION_SECRET=<segredo estável com pelo menos 32 caracteres>
```

Um proxy autenticador deve validar o usuário, remover qualquer header de identidade recebido da
internet e escrever o header configurado. O processo Node deve aceitar tráfego somente desse
proxy, por bind privado, firewall ou rede interna. Expor o backend diretamente torna o header
forjável.

O servidor transforma a identidade externa em um owner opaco e estável usando HMAC; e-mails ou IDs
do provedor não são gravados nas tabelas de circuitos.

## HTTPS e hardening

- Defina `OPENCIRCUIT_SECURE_COOKIE=1` quando todo acesso ocorrer por HTTPS.
- Preserve os headers CSP, `nosniff`, política de referrer e proteção contra frames emitidos pelo
  servidor.
- Mantenha o rate limiter ativo e aplique limites adicionais no proxy para uma implantação pública.
- Não registre cookies, headers de autenticação, corpos de circuitos ou segredos.
- Faça backup dos dois bancos SQLite e do segredo de sessão.

## Migração dos owners legados

Versões antigas aceitavam `X-OpenCircuit-User` criado pelo cliente. Esses registros permanecem no
banco, mas não são associados automaticamente a uma sessão nova porque aceitar uma reivindicação
do cliente recriaria a vulnerabilidade.

Procedimento administrativo:

1. Faça backup dos bancos.
2. Autentique o usuário no modo novo e consulte `GET /api/session` para obter o owner de destino.
3. Confirme por um canal confiável qual owner legado pertence à pessoa.
4. Em manutenção, atualize `owner_id` nas tabelas `circuits` e `library_components`.
5. Confirme isolamento e contagens antes de remover o backup.

Nunca ofereça um endpoint público que aceite livremente o owner legado.
