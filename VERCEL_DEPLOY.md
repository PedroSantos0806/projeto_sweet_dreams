# Sweet Dreams - Instruções para Vercel

Este projeto foi construído para funcionar em ambiente Cloud Run, mas pode ser facilmente adaptado para a Vercel.

## 1. Variáveis de Ambiente
Na Vercel, você deve configurar as seguintes variáveis no painel do projeto:
- `GEMINI_API_KEY`: Sua chave de API do Google AI Studio.

## 2. Configuração do Firebase
Para que o login e o banco de dados funcionem na Vercel:
1. Vá ao Console do Firebase (https://console.firebase.google.com).
2. Selecione seu projeto.
3. Vá em **Authentication** > **Settings** > **Authorized Domains**.
4. Adicione o domínio da sua aplicação na Vercel (ex: `sweet-dreams.vercel.app`).
5. Certifique-se de que o **Anonymous Auth** está ativado em **Authentication** > **Sign-in method**.

## 3. Script de Build
O comando de build na Vercel deve ser `npm run build` e o diretório de saída deve ser `dist`.

## 4. Banco de Dados
O banco de dados Firestore é gerenciado automaticamente pelo Firebase, então basta que as regras de segurança (arquivo `firestore.rules`) estejam aplicadas corretamente via CLI ou Console.
