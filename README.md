# Zelo

Aplicativo para organizar medicamentos, horários e lembretes de tomada, com suporte a fotos, histórico e acompanhamento de saúde.

## Recursos

- Cadastro de medicamentos e horários flexíveis
- Lembretes locais e alarmes de tomada
- Registro de doses tomadas, adiadas ou ignoradas
- Consultas ao assistente por texto ou foto
- Sincronização opcional com Supabase
- Experiência para Android, iOS e web

## Tecnologias

- React Native 0.86 e React 19
- Expo SDK 57 e Expo Router
- TypeScript
- SQLite para persistência local
- Supabase para autenticação, sincronização e Edge Functions
- Vercel para publicação web

## Requisitos

- Node.js `^22.13.0`, `^24.3.0` ou `>=25.0.0`
- npm
- Expo Go ou um simulador/emulador para testes nativos

## Configuração

Instale as dependências:

```bash
npm install
```

Crie o arquivo local de ambiente:

```bash
cp .env.example .env.local
```

Preencha as variáveis públicas do Supabase em `.env.local`. Esse arquivo não deve ser commitado.

## Desenvolvimento

```bash
npm start
```

Outros comandos disponíveis:

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run build:web
npx tsc --noEmit
```

## Supabase

As migrations e a Edge Function do assistente estão em `supabase/`. O arquivo `supabase/functions/.env.example` documenta as variáveis necessárias no ambiente da função.

## Documentação

- [Plano do projeto](docs/PROJECT_PLAN.md)
- [Especificação de design](docs/DESIGN_SPEC.md)

## Licença

Este projeto é distribuído sob os termos do arquivo [LICENSE](LICENSE).
