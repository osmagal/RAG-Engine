# 🚀 Assistente Inteligente RAG - Simulador Corporativo

Este é um sistema full-stack de **Geração Recuperada por Contexto (RAG - Retrieval-Augmented Generation)** projetado para simular um ambiente corporativo inteligente. Ele consolida bases de dados estáticas (Políticas de Reembolso, Regras de Contrato e FAQs) com uma base de dados dinâmica de contatos e localizações de empresas parceiras hospedada no **Firebase Firestore**, permitindo consultas inteligentes em tempo real potencializadas por Inteligência Artificial.

🔗 **Link para Acesso Oficial (Vercel):** [https://rag-engine-project.vercel.app/](https://rag-engine-project.vercel.app/)

---

## 🏗️ Arquitetura do Projeto

O projeto foi estruturado seguindo o padrão full-stack unificado (Frontend SPA + Backend API), otimizado para execução local e compatibilidade total com arquitetura serverless (Vercel).

```
├── api/
│   └── index.ts               # Ponto de entrada das Serverless Functions da Vercel
├── assets/                    # Arquivos e metadados auxiliares
├── src/
│   ├── components/            # Componentes visuais modulares do React
│   ├── documents/             # Base de documentos de conhecimento (Políticas, Contratos, FAQs)
│   ├── App.tsx                # Interface SPA principal e gerenciamento de estado global
│   ├── index.css              # Estilos globais e utilitários Tailwind CSS
│   └── main.tsx               # Inicialização do React
├── server.ts                  # Servidor Express com rotas de API, lógica RAG e integrações
├── vercel.json                # Configuração de rotas e build para o ambiente Vercel
├── favicon.svg                # Favicon moderno em formato vetorizado
└── package.json               # Gerenciamento de scripts e dependências
```

---

## 🛠️ Tecnologias e Camadas

### 1. Frontend (SPA React + Vite)
*   **Vite**: Responsável pela compilação ultrarrápida do frontend.
*   **Tailwind CSS**: Estilização moderna baseada em utilitários, garantindo um design de alta fidelidade visual, com suporte responsivo completo e tema dark premium (Slate/Indigo).
*   **Motion (Framer Motion)**: Utilizado para animações fluidas de microinterações, transições de filtros e feedback visual nas listagens.
*   **Lucide React**: Biblioteca de ícones moderna e limpa para indicação de estados, telefones, localizações e filtros de busca.

### 2. Backend (Express.js + Node.js)
*   O arquivo `server.ts` expõe uma API REST robusta que lida com o gerenciamento de base de conhecimento local e interações externas:
    *   `POST /ask`: Recebe a pergunta do usuário, compila os documentos estáticos relevantes e o contexto de contatos do Firebase filtrados, formata a diretriz do sistema de forma segura e invoca a API do Gemini.
    *   `GET /api/contacts`: Retorna a lista paginada e filtrada de empresas e leads, aplicando regras dinâmicas e de proteção contra limites de cota.
    *   `GET /api/documents`: Retorna os documentos de texto que compõem o escopo básico do conhecimento corporativo.
    *   `GET /api/firebase-status`: Monitora a integridade da comunicação com o Firestore, detectando falhas ou limites excedidos do plano Spark.

### 3. Banco de Dados (Firebase Firestore)
*   Integrado de forma otimizada usando `@firebase/firestore/lite` no backend para maior rapidez em ambientes serverless.
*   **Estratégia Anti-Quota-Exceeded**: As chamadas inteligentes dividem os filtros: segmentos específicos são filtrados em nível de consulta do Firestore para reduzir operações de leitura, e filtros secundários (DDD, Estado, País) são refinados em memória, garantindo persistência sem violar o limite diário de leitura da conta gratuita (Spark) do usuário.
*   **Resiliência a Falhas**: Em caso de erros de rede ou cotas de leitura esgotadas no Firebase, o sistema captura a exceção de forma transparente e fornece mensagens de status apropriadas, sem derrubar a aplicação.

### 4. Inteligência Artificial (Gemini API com Fallback Inteligente)
*   Desenvolvido utilizando o SDK oficial de última geração **`@google/genai`**.
*   **Processamento RAG Estrito**: O modelo é instruído sistematicamente (temperatura `0.1`) para responder estritamente com base nos documentos corporativos providos no prompt, evitando alucinações.
*   **Orquestração de Modelos**: Implementa uma fila resiliente de redundância (Fallback Chain) que garante alta disponibilidade da IA tentando realizar a consulta sequencialmente através de múltiplos modelos:
    1.  `gemini-3.5-flash` (Padrão)
    2.  `gemini-3.1-pro-preview`
    3.  `gemini-flash-latest`
    4.  `gemini-3.1-flash-lite`
    5.  `gemini-2.5-pro`
    6.  `gemini-2.5-flash`

---

## ⚡ Hospedagem Serverless na Vercel

Para que o backend Express e o frontend React funcionem harmoniosamente na nuvem da Vercel sem a necessidade de manter uma VM ligada 24/7, a seguinte infraestrutura foi desenhada:

1.  **Mapeamento de Rotas (`vercel.json`)**:
    *   Qualquer requisição que comece com `/api/*` ou `/ask` é redirecionada para `/api/index.ts`.
    *   O roteamento interno do Express processa essas rotas e devolve as respostas JSON normalmente.
    *   Todas as demais rotas estáticas resolvem para `/index.html` (comportamento nativo de SPA React).
2.  **Inclusão Dinâmica de Arquivos**:
    *   O arquivo de configuração `vercel.json` declara `"includeFiles": "src/documents/**"` para garantir que os arquivos de regras de negócios (FAQ, Cancelamento, etc.) sejam devidamente empacotados e fiquem legíveis em disco dentro da função serverless em tempo de execução.

---

## ⚙️ Variáveis de Ambiente

Para rodar o projeto localmente ou implantá-lo na Vercel, preencha as chaves no arquivo `.env` (ou no painel da Vercel) baseando-se no arquivo `.env.example`:

```env
# API Key do Google Gemini para processar as requisições RAG
GEMINI_API_KEY=sua_chave_do_gemini_aqui

# Chaves de Autenticação do Firebase Cliente
FB_API_KEY=sua_firebase_api_key_aqui
FB_APP_ID=seu_firebase_app_id_aqui
FB_AUTH_DOMAIN=seu_firebase_auth_domain_aqui
FB_DATABASE_URL=seu_firebase_database_url_aqui
FB_PROJECT_ID=seu_firebase_project_id_aqui
FB_STORAGE_BUCKET=seu_firebase_storage_bucket_aqui
FB_MSG_SENDER=seu_firebase_msg_sender_aqui
FB_MEASUREMENT_ID=seu_firebase_measurement_aqui
```

---

## 🚀 Como Executar Localmente

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Inicie o servidor de desenvolvimento (que inicia simultaneamente o backend Express e serve o frontend):
    ```bash
    npm run dev
    ```
3.  Acesse a aplicação em `http://localhost:3000`.
