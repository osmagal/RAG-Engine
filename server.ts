import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as pdf from "pdf-parse";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const PORT = 3000;

  // Initialize GoogleGenAI
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const documentsDir = path.join(process.cwd(), "src", "documents");

  // Initialize Firebase Client SDK to read the user's base_de_contatos Firestore
  const firebaseConfig = {
    apiKey: process.env.FB_API_KEY,
    authDomain: "base-de-contatos-e834a.firebaseapp.com",
    databaseURL: "https://base-de-contatos-e834a-default-rtdb.firebaseio.com",
    projectId: "base-de-contatos-e834a",
    storageBucket: "base-de-contatos-e834a.firebasestorage.app",
    messagingSenderId: "758600957177",
    appId: process.env.FB_APP_ID,
    measurementId: "G-MFQMZKBNHB"
  };

  const FALLBACK_CONTACTS = [
    {
      id: "112013997",
      key: "112013997",
      name: "Loja do Tapeceiro",
      segmento: "Tapeçaria",
      phone: "(11) 2013-9997",
      endereco: "R. Pascoal Dias, 103 - Jardim Santa Adelia, São Paulo - SP, 03971-010"
    },
    {
      id: "1120284151",
      key: "1120284151",
      name: "Mecânica Precision Auto",
      segmento: "Oficina Mecânica",
      phone: "(11) 98765-4321",
      endereco: "Av. Principal, 1500 - Centro, São Paulo - SP, 01000-000"
    },
    {
      id: "1120682698",
      key: "1120682698",
      name: "EletroVolt Instalações",
      segmento: "Eletricista",
      phone: "(11) 2154-8890",
      endereco: "Rua das Flores, 45 - Vila Mariana, São Paulo - SP, 04123-010"
    },
    {
      id: "1120890430",
      key: "1120890430",
      name: "HidroPrime Desentupidora",
      segmento: "Encanador",
      phone: "(11) 3344-5566",
      endereco: "Rua do Oratório, 892 - Mooca, São Paulo - SP, 03116-000"
    }
  ];

  let firestoreDb: any = null;
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
    console.log("[Firebase] Inicializado com sucesso para o projeto:", firebaseConfig.projectId);
  } catch (err) {
    console.error("[Firebase] Erro de inicialização:", err);
  }

  let cachedContacts: any[] | null = null;
  let lastFetchTime = 0;
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

  async function fetchAndCacheContacts(): Promise<any[]> {
    if (!firestoreDb) return FALLBACK_CONTACTS;
    try {
      const contactsCol = collection(firestoreDb, "contacts");
      const snapshot = await getDocs(contactsCol);
      if (snapshot.empty) {
        return FALLBACK_CONTACTS;
      }
      const contactsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          endereco: data.endereco || "",
          phone: data.phone || "",
          segmento: data.segmento || "",
          key: data.key || ""
        };
      });
      
      cachedContacts = contactsList;
      lastFetchTime = Date.now();
      console.log(`[Firebase] Cache atualizado com sucesso. ${contactsList.length} contatos carregados.`);
      return contactsList;
    } catch (error) {
      console.error("[Firebase] Erro na consulta do Firestore, usando fallback offline:", error);
      return FALLBACK_CONTACTS;
    }
  }

  async function fetchAndCacheContactsWithTimeout(): Promise<any[]> {
    return new Promise(async (resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn("[Firebase] Timeout (1500ms) ao conectar ao banco de dados em produção. Retornando dados offline.");
          // Populate cache with fallbacks to avoid repeating timeouts immediately
          if (!cachedContacts) {
            cachedContacts = FALLBACK_CONTACTS;
            lastFetchTime = Date.now();
          }
          resolve(FALLBACK_CONTACTS);
        }
      }, 1500);

      try {
        const list = await fetchAndCacheContacts();
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve(list);
        }
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.error("[Firebase] Erro ao buscar contatos, retornando dados offline:", error);
          if (!cachedContacts) {
            cachedContacts = FALLBACK_CONTACTS;
            lastFetchTime = Date.now();
          }
          resolve(FALLBACK_CONTACTS);
        }
      }
    });
  }

  async function getFirebaseContacts(): Promise<any[]> {
    const now = Date.now();
    // Return cache immediately if it's still fresh
    if (cachedContacts && (now - lastFetchTime < CACHE_TTL)) {
      return cachedContacts;
    }

    // If cache exists but expired, trigger update in background, return stale cache immediately
    if (cachedContacts) {
      console.log("[Firebase] Cache expirou. Atualizando contatos em background.");
      fetchAndCacheContacts().catch(err => console.error("[Firebase] Erro ao atualizar cache em background:", err));
      return cachedContacts;
    }

    // First run: block up to 1.5s then resolve
    return fetchAndCacheContactsWithTimeout();
  }

  // Pre-fetch contacts once server starts up to populate the cache and speed up the very first request
  getFirebaseContacts().then(contacts => {
    console.log(`[Firebase] Pré-carregamento inicial concluído. Cache populado com ${contacts.length} contatos.`);
  }).catch(err => {
    console.error("[Firebase] Erro no pré-carregamento inicial:", err);
  });

  function getDocuments() {
    try {
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }
      const files = fs.readdirSync(documentsDir);
      const docs = files
        .filter(file => file.endsWith(".txt"))
        .map((file) => {
          const filePath = path.join(documentsDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const title = file
            .replace(".txt", "")
            .split("_")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          return {
            name: file,
            title,
            content
          };
        });
      return docs;
    } catch (error) {
      console.error("Error reading documents:", error);
      return [];
    }
  }

  // API Route to ask questions (RAG)
  app.post("/ask", async (req, res) => {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "A pergunta é obrigatória e deve ser uma string." });
    }

    try {
      const docs = getDocuments();
      let docsContext = "";
      docs.forEach((doc, i) => {
        docsContext += `\n--- DOCUMENTO ${i+1}: ${doc.title} ---\n${doc.content}\n`;
      });

      // Get Firebase contacts for RAG context
      const contacts = await getFirebaseContacts();
      let contactsContext = "";
      if (contacts && contacts.length > 0) {
        contactsContext += "\n--- BASE DE CONTATOS DE EMPRESAS (FIREBASE FIRESTORE) ---\n";
        contacts.forEach((contact, idx) => {
          contactsContext += `${idx + 1}. ${contact.name}\n`;
          if (contact.segmento) contactsContext += `   - Segmento: ${contact.segmento}\n`;
          if (contact.phone) contactsContext += `   - Telefone: ${contact.phone}\n`;
          if (contact.endereco) contactsContext += `   - Endereço: ${contact.endereco}\n`;
          contactsContext += `   - Chave/ID: ${contact.key || contact.id}\n\n`;
        });
      }

      const systemInstruction = `Você é um Assistente Corporativo Inteligente especialista em responder perguntas com base estritamente nos documentos internos fornecidos como contexto (Política de Reembolso, Regras de Contrato e FAQ Interno) E também na Base de Contatos e Localizações de Empresas parceiras cadastradas no Firebase.

DIRETRIZES DE RESPOSTA:
1. CRUZAMENTO DE INFORMAÇÕES (PERGUNTAS RELEVANTES):
Se a pergunta envolver cruzar dados de múltiplos documentos internos (ex: pedir reembolso após cancelar o contrato, prazos de reembolso e solicitação, ou se suporte resolve reembolsos), responda de forma muito clara, direta, profissional e precisa, utilizando as regras contidas nos documentos fornecidos.

2. RECOMENDAÇÕES, CONTATOS E LOCALIZAÇÕES DE EMPRESAS (RAG DO FIREBASE):
Se o usuário perguntar por recomendações de empresas, contatos, telefones, segmentos (ex: "tapeçaria", "mecânica", "lojas", etc.) ou endereços de empresas cadastradas no Firebase, você deve consultar a "Base de Contatos de Empresas (Firebase)" no contexto e indicar as informações correspondentes de forma muito amigável, organizada e completa.
- Sempre retorne o Nome da Empresa, o Segmento de atuação, o Telefone e o Endereço completo.
- Se o usuário pedir recomendações ou perguntar "onde encontrar" tal serviço, procure e sugira a empresa correta que corresponda ao segmento solicitado.
- Caso o usuário pergunte sobre alguma empresa ou segmento que NÃO esteja em nosso cadastro de contatos do Firebase, responda de forma educada e profissional informando que no momento nenhuma empresa para esse segmento está cadastrada na nossa base do Firebase.

3. FORA DE CONTEXTO (PERGUNTAS NÃO RELACIONADAS):
Se a pergunta foi sobre assuntos gerais totalmente alheios aos documentos internos e à Base de Contatos de Empresas do Firebase (ex: "Qual a capital da Espanha?", "Quem escreveu Dom Casmurro?", etc.), informe polidamente que você é um assistente corporativo focado nas políticas de reembolso, contratos e indicações de contatos parceiros cadastrados, e que essa informação está fora do seu escopo de conhecimento.

4. PERGUNTAS AMBÍGUAS:
Se a pergunta for ambígua ou incompleta (por exemplo: "Quanto tempo demora?", "Posso cancelar?", "Isso tem custo?"), você deve mapear as possíveis interpretações com base nos documentos e apresentar as opções claras.
- Exemplo 1 ("Quanto tempo demora?"): Explique que o cancelamento do contrato leva até 3 dias úteis para ser efetivado, e o reembolso aprovado leva até 10 dias úteis para ser pago.
- Exemplo 2 ("Posso cancelar?"): Explique que sim, o cancelamento pode ser feito a qualquer momento no Painel. Se for nos primeiros 7 dias (carência) é grátis; depois incide perda de parcelas e multa de 20% do saldo devedor restante em planos anuais.
- Exemplo 3 ("Isso tem custo?"): Esclareça que depende. Se for o cancelamento do contrato, nos primeiros 7 dias é gratuito; após os 7 dias, há multa de 20% sobre o saldo devedor restante em planos anuais. O pedido de reembolso em si não tem custo.

FORMATO DE SAÍDA:
- Responda em português (PT-BR).
- Mantenha um tom profissional, corporativo, prestativo e direto.
- Não faça referências ao formato técnico do prompt ou ao fato de estar recebendo "textos txt", "JSON" ou "marcações de contexto". Fale naturalmente, como "Consultando nosso banco de contatos..." ou "Com base nos termos da nossa empresa...".`;

      const prompt = `DOCUMENTOS INTERNOS DISPONÍVEIS:
${docsContext}

BASE DE CONTATOS DE EMPRESAS (FIREBASE):
${contactsContext || "Nenhum contato encontrado no Firebase."}

PERGUNTA DO USUÁRIO:
${question}

Por favor, responda com base estritamente nos documentos internos e na base de contatos fornecida acima de acordo com as diretrizes.`;

      const MODEL_FALLBACK_LIST = [
        "gemini-3.5-flash",
        "gemini-3.1-pro-preview",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-2.5-pro",
        "gemini-2.5-flash"
      ];

      let response = null;
      let modelUsed = "";
      let lastError: any = null;

      for (const model of MODEL_FALLBACK_LIST) {
        try {
          console.log(`[RAG-API] Tentando obter resposta com o modelo: ${model}...`);
          response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.1, // low temperature for absolute precision
            }
          });
          modelUsed = model;
          console.log(`[RAG-API] Sucesso com o modelo: ${model}`);
          break;
        } catch (err: any) {
          console.error(`[RAG-API] Falha no modelo ${model}:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw new Error(`Todos os modelos de fallback falharam. Último erro: ${lastError?.message || lastError}`);
      }

      const answer = response.text || "Desculpe, não consegui obter uma resposta para a sua solicitação.";
      res.json({ answer, modelUsed });
    } catch (error: any) {
      console.error("Erro na API de RAG:", error);
      res.status(500).json({ error: "Erro interno ao processar a pergunta.", details: error.message });
    }
  });

  // API to list documents
  app.get("/api/documents", (req, res) => {
    res.json(getDocuments());
  });

  // API to list Firebase contacts
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await getFirebaseContacts();
      res.json(contacts);
    } catch (err: any) {
      console.error("Erro no endpoint /api/contacts:", err);
      res.status(500).json({ error: "Erro ao obter contatos.", details: err.message });
    }
  });

  // API to save a document
  app.post("/api/documents", async (req, res) => {
    const { name, content, isBase64 } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: "Nome e conteúdo do documento são obrigatórios." });
    }
    const cleanName = path.basename(name).replace(/\s+/g, "_"); // prevent path traversal
    try {
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      const isPdf = name.toLowerCase().endsWith(".pdf");

      if (isPdf && isBase64) {
        const pdfParser = typeof pdf === "function" ? pdf : (pdf as any).default;
        const buffer = Buffer.from(content, "base64");
        
        try {
          const parsedData = await pdfParser(buffer);
          const txtContent = parsedData.text || "PDF vazio ou sem texto legível extraído.";
          
          const textFilename = cleanName.replace(/\.pdf$/i, "") + ".txt";
          fs.writeFileSync(path.join(documentsDir, textFilename), txtContent, "utf-8");
          
          return res.json({ 
            success: true, 
            message: `PDF "${name}" processado e indexado com sucesso!` 
          });
        } catch (pdfError: any) {
          console.error("Erro ao processar PDF:", pdfError);
          return res.status(500).json({ 
            error: "Erro ao extrair texto do arquivo PDF.", 
            details: pdfError.message 
          });
        }
      }

      // Default text flow (supports direct text or base64 text)
      const textFilename = cleanName.endsWith(".txt") ? cleanName : `${cleanName}.txt`;
      const fileContent = isBase64 ? Buffer.from(content, "base64").toString("utf-8") : content;
      
      fs.writeFileSync(path.join(documentsDir, textFilename), fileContent, "utf-8");
      res.json({ success: true, message: "Documento salvo com sucesso!" });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao salvar o documento.", details: error.message });
    }
  });

  // API to delete a document
  app.delete("/api/documents/:name", (req, res) => {
    const { name } = req.params;
    const cleanName = path.basename(name);
    try {
      const filePath = path.join(documentsDir, cleanName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Documento deletado com sucesso!" });
      } else {
        res.status(404).json({ error: "Documento não encontrado." });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao deletar o documento.", details: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
