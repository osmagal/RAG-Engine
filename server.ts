import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, limit } from "firebase/firestore";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = 3000;

  // Lazy initialization of GoogleGenAI to prevent crash if apiKey is missing on startup
  let aiInstance: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("A variável de ambiente GEMINI_API_KEY é necessária para realizar consultas com Inteligência Artificial.");
      }
      aiInstance = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  const isVercel = !!process.env.VERCEL;
  const documentsDir = isVercel
    ? path.join("/tmp", "documents")
    : path.join(process.cwd(), "src", "documents");

  const EMBEDDED_DOCUMENTS = [
    {
      name: "politica_reembolso.txt",
      title: "Politica Reembolso",
      content: "A empresa realiza reembolsos em até 30 dias corridos após a aprovação da solicitação.\nPara solicitar o reembolso, o cliente deve enviar os comprovantes e preencher o formulário oficial.\nSolicitações enviadas após 60 dias da compra não serão aceitas."
    },
    {
      name: "regras_contrato.txt",
      title: "Regras Contrato",
      content: "O contrato tem duração mínima de 12 meses.\nO cancelamento antecipado implica multa de 20% sobre o valor restante do contrato.\nO suporte técnico está disponível em horário comercial, de segunda a sexta-feira, das 08h às 18h."
    },
    {
      name: "faq_interno.txt",
      title: "Faq Interno",
      content: "Pergunta: Como entro em contato com o suporte?\nResposta: O suporte pode ser acionado por e-mail ou telefone durante o horário comercial.\nPergunta: Posso cancelar meu contrato a qualquer momento?\nResposta: Sim, porém haverá multa conforme regras contratuais.\nPergunta: Qual o prazo de resposta do suporte?\nResposta: O prazo médio de resposta é de até 24 horas úteis."
    }
  ];

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

  let firestoreDb: any = null;
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
    console.log("[Firebase] Inicializado com sucesso para o projeto:", firebaseConfig.projectId);
  } catch (err) {
    console.error("[Firebase] Erro de inicialização:", err);
  }

  // Helper to extract DDD from phone number
  function extractDDD(phone: string): string {
    if (!phone) return "";
    const match = phone.match(/\((\d{2})\)/);
    if (match) return match[1];
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 2) return digits.substring(0, 2);
    return "";
  }

  // Helper to extract Estado from address
  function extractEstado(endereco: string): string {
    if (!endereco) return "";
    const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    for (const state of states) {
      const regex = new RegExp(`\\b${state}\\b`, "i");
      if (regex.test(endereco)) {
        return state;
      }
    }
    return "";
  }

  // Helper to extract Pais from address
  function extractPais(endereco: string): string {
    if (!endereco) return "";
    if (endereco.toLowerCase().includes("brasil") || endereco.toLowerCase().includes("brazil")) {
      return "Brasil";
    }
    return "Brasil";
  }

  async function fetchFirebaseContactsWithFilters(filters: {
    ddd?: string;
    estado?: string;
    pais?: string;
    segmento?: string;
    page: number;
    limit: number;
  }): Promise<{ contacts: any[]; total: number; allSegmentos: string[]; allDDDs: string[]; allEstados: string[]; allPaises: string[] }> {
    if (!firestoreDb) {
      return { contacts: [], total: 0, allSegmentos: [], allDDDs: [], allEstados: [], allPaises: [] };
    }

    try {
      // Clear error states on success
      firebaseErrorMessage = null;
      isFirebaseQuotaExceeded = false;

      const contactsCol = collection(firestoreDb, "contacts");
      let q = query(contactsCol);

      // If a segmento filter is specified, query it at Firestore level to reduce read operations
      if (filters.segmento) {
        q = query(q, where("segmento", "==", filters.segmento));
      }

      const hasInMemoryFilters = filters.ddd || filters.estado || filters.pais;
      
      // Determine the limit for the Firestore query
      let firestoreLimit = 100;
      if (hasInMemoryFilters) {
        // If we have filters that require in-memory parsing (DDD, Estado, Pais),
        // we fetch a larger chunk of records to filter them in-memory.
        firestoreLimit = 2000;
      } else {
        // If we don't have in-memory filters, we only need to fetch up to the requested page
        firestoreLimit = filters.page * filters.limit;
      }

      q = query(q, limit(firestoreLimit));

      const snapshot = await getDocs(q);
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

      // Enrich contacts with extracted fields
      const enrichedContacts = contactsList.map(c => {
        const cDdd = extractDDD(c.phone);
        const cEstado = extractEstado(c.endereco);
        const cPais = extractPais(c.endereco);
        return {
          ...c,
          ddd: cDdd,
          estado: cEstado,
          pais: cPais
        };
      });

      // Filter in-memory by DDD, Estado, Pais
      let filtered = enrichedContacts;
      if (filters.ddd) {
        filtered = filtered.filter(c => c.ddd === filters.ddd);
      }
      if (filters.estado) {
        filtered = filtered.filter(c => c.estado?.toUpperCase() === filters.estado?.toUpperCase());
      }
      if (filters.pais) {
        filtered = filtered.filter(c => c.pais?.toLowerCase() === filters.pais?.toLowerCase());
      }

      let total = filtered.length;
      let paginatedContacts = [];

      if (hasInMemoryFilters) {
        // Since we filtered in-memory, we slice the filtered array
        const startIndex = (filters.page - 1) * filters.limit;
        paginatedContacts = filtered.slice(startIndex, startIndex + filters.limit);
      } else {
        // Since we queried exactly the required amount from Firestore, we take the last 100
        const startIndex = (filters.page - 1) * filters.limit;
        paginatedContacts = filtered.slice(startIndex, startIndex + filters.limit);
        
        // If we returned exactly the amount queried or more, there might be more pages
        if (contactsList.length >= firestoreLimit) {
          total = firestoreLimit + 100; // Let the UI know there is at least one more page
        } else {
          total = contactsList.length;
        }
      }

      // Compile unique options for dropdown filters
      const allSegmentos = Array.from(new Set(enrichedContacts.map(c => c.segmento).filter(Boolean))).sort();
      const allDDDs = Array.from(new Set(enrichedContacts.map(c => c.ddd).filter(Boolean))).sort();
      const allEstados = Array.from(new Set(enrichedContacts.map(c => c.estado).filter(Boolean))).sort();
      const allPaises = Array.from(new Set(enrichedContacts.map(c => c.pais).filter(Boolean))).sort();

      return {
        contacts: paginatedContacts,
        total,
        allSegmentos,
        allDDDs,
        allEstados,
        allPaises
      };
    } catch (error: any) {
      console.error("[Firebase] Erro ao buscar contatos com filtros:", error);
      const msg = error?.message || String(error);
      const code = error?.code || "";
      firebaseErrorMessage = msg;
      
      if (
        code.includes("resource-exhausted") || 
        code.includes("quota") ||
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("limit") ||
        msg.toLowerCase().includes("exhausted") ||
        msg.toLowerCase().includes("billing") ||
        msg.toLowerCase().includes("payment") ||
        msg.toLowerCase().includes("exceeded") ||
        msg.toLowerCase().includes("over_quota")
      ) {
        isFirebaseQuotaExceeded = true;
      }
      return { contacts: [], total: 0, allSegmentos: [], allDDDs: [], allEstados: [], allPaises: [] };
    }
  }

  let cachedContacts: any[] | null = null;
  let lastFetchTime = 0;
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

  let firebaseErrorMessage: string | null = null;
  let isFirebaseQuotaExceeded = false;

  async function fetchAndCacheContacts(): Promise<any[]> {
    if (!firestoreDb) return [];
    try {
      const contactsCol = collection(firestoreDb, "contacts");
      const snapshot = await getDocs(contactsCol);
      
      // Clear error states on success
      firebaseErrorMessage = null;
      isFirebaseQuotaExceeded = false;

      if (snapshot.empty) {
        return [];
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
    } catch (error: any) {
      console.error("[Firebase] Erro na consulta do Firestore:", error);
      const msg = error?.message || String(error);
      const code = error?.code || "";
      firebaseErrorMessage = msg;
      
      if (
        code.includes("resource-exhausted") || 
        code.includes("quota") ||
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("limit") ||
        msg.toLowerCase().includes("exhausted") ||
        msg.toLowerCase().includes("billing") ||
        msg.toLowerCase().includes("payment") ||
        msg.toLowerCase().includes("exceeded") ||
        msg.toLowerCase().includes("over_quota")
      ) {
        isFirebaseQuotaExceeded = true;
      }
      return [];
    }
  }

  async function fetchAndCacheContactsWithTimeout(): Promise<any[]> {
    return new Promise(async (resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn("[Firebase] Timeout (1500ms) ao conectar ao banco de dados em produção.");
          // Populate cache with empty list to avoid repeating timeouts immediately
          if (!cachedContacts) {
            cachedContacts = [];
            lastFetchTime = Date.now();
          }
          resolve([]);
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
          console.error("[Firebase] Erro ao buscar contatos:", error);
          if (!cachedContacts) {
            cachedContacts = [];
            lastFetchTime = Date.now();
          }
          resolve([]);
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

  // No pre-fetch contacts at module level to prevent serverless function cold-start timeouts
  function getDocuments() {
    const docs = new Map<string, { name: string; title: string; content: string }>();

    // 1. Load embedded documents by default so they are always available
    EMBEDDED_DOCUMENTS.forEach(doc => {
      docs.set(doc.name, { ...doc });
    });

    // 2. Try to read from local src/documents directory relative to cwd if it exists (for dev/local)
    try {
      const localSrcDir = path.join(process.cwd(), "src", "documents");
      if (fs.existsSync(localSrcDir)) {
        const files = fs.readdirSync(localSrcDir);
        files.forEach(file => {
          if (file.endsWith(".txt")) {
            try {
              const filePath = path.join(localSrcDir, file);
              const content = fs.readFileSync(filePath, "utf-8");
              const title = file
                .replace(".txt", "")
                .split("_")
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
              docs.set(file, { name: file, title, content });
            } catch (err) {
              console.error("[FS-Loader] Erro ao ler documento local:", file, err);
            }
          }
        });
      }
    } catch (e) {
      console.warn("[FS-Loader] Não foi possível ler diretório local src/documents:", e);
    }

    // 3. Try to read from dynamic documentsDir (which can be /tmp/documents on Vercel)
    try {
      if (fs.existsSync(documentsDir)) {
        const files = fs.readdirSync(documentsDir);
        files.forEach(file => {
          if (file.endsWith(".txt")) {
            try {
              const filePath = path.join(documentsDir, file);
              const content = fs.readFileSync(filePath, "utf-8");
              const title = file
                .replace(".txt", "")
                .split("_")
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
              docs.set(file, { name: file, title, content });
            } catch (err) {
              console.error("[FS-Loader] Erro ao ler documento dinâmico:", file, err);
            }
          }
        });
      }
    } catch (e) {
      console.warn("[FS-Loader] Não foi possível ler diretório dinâmico:", e);
    }

    return Array.from(docs.values());
  }

  // API Route to ask questions (RAG)
  app.post("/ask", async (req, res) => {
    const { question, filters } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "A pergunta é obrigatória e deve ser uma string." });
    }

    try {
      const docs = getDocuments();
      let docsContext = "";
      docs.forEach((doc, i) => {
        docsContext += `\n--- DOCUMENTO ${i+1}: ${doc.title} ---\n${doc.content}\n`;
      });

      // Get Firebase contacts for RAG context using active filters or default to first 100
      const activeFilters = filters || {};
      const { contacts } = await fetchFirebaseContactsWithFilters({
        ddd: activeFilters.ddd,
        estado: activeFilters.estado,
        pais: activeFilters.pais,
        segmento: activeFilters.segmento,
        page: 1,
        limit: 100
      });
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
          response = await getAiClient().models.generateContent({
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
      const ddd = req.query.ddd as string;
      const estado = req.query.estado as string;
      const pais = req.query.pais as string;
      const segmento = req.query.segmento as string;
      const page = parseInt(req.query.page as string || "1", 10);
      const limitVal = parseInt(req.query.limit as string || "100", 10);

      const result = await fetchFirebaseContactsWithFilters({
        ddd,
        estado,
        pais,
        segmento,
        page,
        limit: limitVal
      });
      res.json(result);
    } catch (err: any) {
      console.error("Erro no endpoint /api/contacts:", err);
      res.status(500).json({ error: "Erro ao obter contatos.", details: err.message });
    }
  });

  // API to get Firebase status
  app.get("/api/firebase-status", (req, res) => {
    res.json({
      initialized: !!firestoreDb,
      error: firebaseErrorMessage,
      isQuotaExceeded: isFirebaseQuotaExceeded
    });
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
        let pdfParser: any;
        try {
          const pdfModule = (await import("pdf-parse")) as any;
          const pdfFn = pdfModule.default || pdfModule;
          pdfParser = typeof pdfFn === "function" ? pdfFn : (pdfFn as any).default;
        } catch (err: any) {
          console.error("Falha ao carregar biblioteca pdf-parse dinamicamente:", err);
          return res.status(500).json({ 
            error: "A biblioteca de processamento de PDF não pôde ser carregada neste ambiente de produção.", 
            details: err.message 
          });
        }
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
    import("vite").then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Server running in dev mode on http://localhost:${PORT}`);
        });
      });
    }).catch((err) => {
      console.error("Erro ao inicializar o servidor de desenvolvimento do Vite:", err);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running in production on port ${PORT}`);
      });
    }
  }

export default app;
