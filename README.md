# Sistema de Geração de Receitas Médicas e Envio de E-mails

Este projeto implementa um sistema automatizado para gerar receitas médicas em PDF e enviá-las por e-mail após a conclusão de uma compra no Stripe.

## Funcionalidades

- Recebimento de webhooks do Stripe para processamento de compras
- Geração dinâmica de PDF de duas páginas:
  - Receita médica personalizada com dados do paciente
  - Instruções de uso específicas para o medicamento adquirido
- Envio automático de e-mails com o PDF anexado para:
  - Farmácia (para impressão e envio ao cliente)
  - Cliente (para acompanhamento)

## Estrutura do Projeto

```
├── index.js                        # Script principal (webhook do Stripe + envio de e-mail)
├── generate_pdf.js                 # Script de geração do PDF dinâmico
├── receita_template.html           # Template HTML da receita médica
├── assets/                         # Pasta para armazenar recursos estáticos
│   ├── logo.png                    # Logo da Perceb
│   └── signature.png               # Assinatura do médico
├── .env                            # Variáveis de ambiente (não versionado)
├── .env.example                    # Exemplo de configuração de variáveis de ambiente
├── node_modules/                   # Dependências (não versionado)
├── package.json                    # Configuração de dependências
├── package-lock.json               # Lock file de dependências
├── .gitignore                      # Configuração de arquivos ignorados pelo Git
└── README.md                       # Este arquivo
```

## Requisitos

- Node.js 14.x ou superior
- NPM 6.x ou superior
- Conta no Stripe com webhook configurado
- Conta no Mailgun com domínio verificado

## Instalação

1. Clone este repositório:
   ```
   git clone [URL_DO_REPOSITORIO]
   cd [NOME_DO_DIRETORIO]
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`:
     ```
     cp .env.example .env
     ```
   - Edite o arquivo `.env` com suas credenciais:
     ```
     # Configurações do Mailgun
     MAILGUN_API_KEY=sua_chave_api_aqui
     MAILGUN_DOMAIN=seu_dominio_aqui
     
     # Configurações de Email
     EMAIL_FROM_NAME=Perceb Notificações
     EMAIL_FROM_ADDRESS=noreply@mail.perceb.com.br
     EMAIL_TO=email_farmacia@exemplo.com,email_cliente@exemplo.com
     
     # Configurações do servidor
     PORT=5002
     ```

## Uso

1. Inicie o servidor:
   ```
   npm start
   ```

2. Configure o webhook do Stripe para apontar para:
   ```
   https://[seu_dominio]/webhook
   ```

3. Certifique-se de que os arquivos de logo e assinatura estejam na pasta `assets/`.

## Desenvolvimento

Para testar a geração de PDF sem acionar o webhook:

```
npm test
```

Isso gerará um PDF de exemplo com dados fictícios para validação.

## Próximos Passos

- Implementar a lógica para selecionar as instruções corretas com base no produto
- Configurar o envio de e-mails separados para farmácia e cliente
- Adicionar verificação de assinatura do webhook do Stripe
- Implementar sistema de logs mais robusto

## Segurança

Em ambiente de produção:
- Nunca armazene chaves de API diretamente no código
- Sempre verifique a assinatura dos webhooks do Stripe
- Use variáveis de ambiente para credenciais sensíveis
- Certifique-se de que o arquivo `.env` está no `.gitignore` para evitar expor credenciais

## Solução de Problemas

### Erro de Push no GitHub

Se você encontrar um erro ao fazer push para o GitHub relacionado a segredos detectados:

1. Verifique se todas as credenciais foram removidas do código e movidas para o arquivo `.env`
2. Certifique-se de que o arquivo `.env` está listado no `.gitignore`
3. Se necessário, use o comando `git filter-branch` ou o BFG Repo-Cleaner para remover credenciais de commits anteriores
