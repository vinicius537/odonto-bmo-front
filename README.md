# Odonto BMO Front

Frontend da aplicacao odontologica para clinicas e dentistas.

## Requisitos

- Node.js 20+
- npm 10+
- Docker e Docker Compose (opcional)

## Executar localmente

```sh
npm ci
npm start
```

O Vite sobe por padrao na porta `8080`.

## Autenticacao

O frontend usa cookies `HttpOnly` emitidos pela API. Para funcionar em desenvolvimento, o backend precisa aceitar `credentials` via CORS e responder com `Set-Cookie` nos endpoints de autenticacao.

## Build de producao

```sh
npm run build
```

## Executar com Docker Compose

```sh
docker compose up --build
```

A aplicacao sera servida em `http://localhost:8080`.

## Estrutura

- `src/`: codigo-fonte da aplicacao React
- `public/`: arquivos estaticos
- `docker/nginx.conf`: configuracao do Nginx para SPA
- `Dockerfile`: imagem de producao
- `docker-compose.yml`: orquestracao local
