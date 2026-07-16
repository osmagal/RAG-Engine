import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Plus,
  Trash2,
  Send,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  FileCode,
  Sparkles,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck,
  MessageSquare,
  Cpu,
  Terminal,
  FileJson,
  MapPin,
  Phone
} from "lucide-react";

interface Document {
  name: string;
  title: string;
  content: string;
}

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  type?: "crossing" | "out_of_context" | "ambiguous" | "custom";
}

interface Contact {
  id: string;
  name: string;
  endereco: string;
  phone: string;
  segmento: string;
  key: string;
}

const DEFAULT_DOCUMENTS = [
  {
    name: "politica_reembolso.txt",
    title: "Politica Reembolso",
    content: `POLÍTICA DE REEMBOLSO CORPORATIVA
Status: Ativo | Versão: 2.4 | Última atualização: Janeiro de 2026

1. PRAZO DE REEMBOLSO
Qualquer reembolso aprovado pelo Departamento Financeiro será processado e pago em até 10 dias úteis (dez dias úteis) a contar da data de homologação/aprovação formal da solicitação. O depósito será realizado via PIX ou transferência bancária na conta indicada pelo titular.

2. COMO FAZER A SOLICITAÇÃO
A solicitação de reembolso deve ser feita exclusivamente por iniciativa do cliente através de seu Painel de Controle, acessando o menu "Financeiro" > "Solicitar Reembolso". É obrigatório:
- Preencher o formulário eletrônico justificando o motivo.
- Anexar cópia do comprovante de pagamento legível (PDF ou imagem).
- Informar os dados bancários para o depósito (PIX ou agência/conta do titular).
Pedidos enviados por e-mail, chat ou telefone não serão processados.

3. REEMBOLSO APÓS CANCELAMENTO DO CONTRATO
Regra Crucial: Não é possível solicitar reembolso após a formalização ou efetivação do cancelamento do contrato. O cancelamento do contrato encerra em definitivo qualquer vínculo ativo e extingue qualquer direito a reembolsos pendentes, retroativos ou futuros. A única exceção é se a solicitação de reembolso tiver sido aberta, justificada e formalmente APROVADA pelo Departamento Financeiro ANTES do cancelamento definitivo do contrato. Caso contrário, qualquer saldo ou direito é considerado renunciado no ato de rescisão.

4. AUTORIZAÇÃO DO SUPORTE TÉCNICO
Importante: A equipe de suporte técnico e de atendimento ao cliente (chat/telefone) serve exclusivamente para suporte operacional de software e infraestrutura. O suporte NÃO possui autorização, autonomia ou ferramentas sistêmicas para processar, aprovar, reabrir ou resolver pedidos de reembolso. Todas as decisões financeiras de reembolso são geridas de forma 100% centralizada e independente pelo Departamento Financeiro.`
  },
  {
    name: "regras_contrato.txt",
    title: "Regras Contrato",
    content: `REGRAS E CONDIÇÕES GERAIS DE CONTRATO
Status: Ativo | Versão: 1.9 | Última atualização: Outubro de 2025

1. CANCELAMENTO DO CONTRATO
O cliente tem o direito de solicitar a rescisão e cancelamento do contrato de prestação de serviços a qualquer momento, diretamente pela central do cliente.
O processo de cancelamento e desativação dos serviços é processado e efetivado pelo sistema em até 3 dias úteis (três dias úteis) a contar da abertura do chamado formal de rescisão.

2. CARÊNCIA E CUSTOS (MULTA RESCISÓRIA)
- Período de Carência (Primeiros 7 dias): Se o cancelamento for solicitado nos primeiros 7 (sete) dias corridos a contar da assinatura do contrato, o cancelamento é totalmente gratuito, não há cobrança de qualquer multa rescisória e os valores eventualmente pagos serão devolvidos integralmente conforme as regras da Política de Reembolso.
- Após o período de Carência (A partir do 8º dia): O cancelamento do plano implica na perda das parcelas mensais já pagas pelo período usufruído. Se o cliente possuir um plano anual ou de fidelidade, incidirá uma multa rescisória de 20% (vinte por cento) sobre o saldo devedor restante do plano contratado (as parcelas que venceriam até o fim do contrato original).

3. PROCESSO DE RESCISÃO
A rescisão contratual torna-se definitiva apenas após a quitação de eventuais faturas em aberto e da multa rescisória calculada automaticamente no painel. O acesso aos sistemas é bloqueado no exato momento da homologação do cancelamento.`
  },
  {
    name: "faq_interno.txt",
    title: "Faq Interno",
    content: `FAQ INTERNO - PERGUNTAS E RESPOSTAS FREQUENTES (SUPORTE E FINANCEIRO)
Apenas para uso interno e orientação de atendimento ao cliente.

P: Posso ligar para o suporte técnico para pedir reembolso?
R: Não. Conforme a política corporativa, o suporte técnico atua exclusivamente em incidentes de tecnologia. O cliente deve abrir a solicitação de reembolso de forma autônoma através do Painel de Controle na aba "Financeiro" > "Solicitar Reembolso".

P: Quanto tempo demora o cancelamento e o reembolso?
R: O cancelamento do contrato leva até 3 dias úteis para ser efetivado pelo sistema a partir da solicitação. Já o pagamento do reembolso, se aprovado, leva até 10 dias úteis para ser depositado na conta bancária informada.

P: Cancelar o contrato tem algum custo?
R: Durante os primeiros 7 dias (período de carência), o cancelamento é gratuito e não há multas. Após os primeiros 7 dias, se o plano for anual/fidelidade, é cobrada uma multa rescisória de 20% sobre o valor restante das parcelas faltantes do contrato.

P: Posso pedir reembolso de faturas antigas?
R: Não. Reembolsos só se aplicam a pagamentos recentes sob análise de carência de 7 dias ou cobranças indevidas comprovadas. Faturas antigas de serviços já prestados/disponibilizados não são reembolsáveis.`
  }
];

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocContent, setNewDocContent] = useState("");

  const [isDragging, setIsDragging] = useState(false);

  const [question, setQuestion] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const triggerFileInput = () => {
    document.getElementById("file-upload-input")?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList: FileList) => {
    const file = fileList[0];
    if (!file) return;

    addLog(`Lendo arquivo: "${file.name}"...`);
    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        const base64Content = result.split(",")[1];
        if (!base64Content) {
          showNotification("Erro ao ler dados do PDF.", "error");
          addLog("ERROR: PDF reading base64 encoding failed.");
          return;
        }

        setIsLoading(true);
        setLoadingStep("Extraindo texto e indexando PDF...");
        addLog("RAG: Parsing PDF binary streams with backend agent...");
        try {
          const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              content: base64Content,
              isBase64: true
            })
          });
          const data = await res.json();
          if (data.success) {
            showNotification(`PDF "${file.name}" importado com sucesso!`, "success");
            addLog(`SUCCESS: PDF "${file.name}" converted and vectorized.`);
            fetchDocuments();
          } else {
            showNotification(data.error || "Erro ao importar PDF", "error");
            addLog(`ERROR: PDF upload failed: ${data.error}`);
          }
        } catch (error) {
          console.error("Error uploading PDF:", error);
          showNotification("Erro ao enviar PDF para o servidor.", "error");
          addLog("ERROR: Request timeout on PDF parsing.");
        } finally {
          setIsLoading(false);
          setLoadingStep("");
        }
      };
      reader.readAsDataURL(file);
    } else {
      // It's a text file
      const reader = new FileReader();
      reader.onload = async (event) => {
        const textContent = event.target?.result as string;
        if (textContent === undefined) {
          showNotification("Erro ao ler conteúdo do arquivo.", "error");
          return;
        }

        setIsLoading(true);
        setLoadingStep("Indexando arquivo de texto...");
        addLog(`RAG: Processing raw text of "${file.name}"...`);
        const success = await saveDocument(file.name, textContent);
        setIsLoading(false);
        setLoadingStep("");
        if (success) {
          showNotification(`Arquivo "${file.name}" importado!`, "success");
        }
      };
      reader.readAsText(file);
    }
  };
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [engineUsed, setEngineUsed] = useState("gemini-3.5-flash");
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM: RAG Engine booted successfully.",
    "> INFO: Vector store index generated locally.",
    "> READY: Awaiting prompt input..."
  ]);

  // Error notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      setContacts(data);
      addLog(`Loaded ${data.length} company contacts from Firebase.`);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      addLog("ERROR: Failed to fetch contacts from Firebase Database.");
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`> ${timestamp} - ${message}`, ...prev.slice(0, 15)]);
  };

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data);
      addLog(`Indexed ${data.length} document source files.`);
    } catch (error) {
      console.error("Error fetching docs:", error);
      showNotification("Erro ao carregar documentos do servidor.", "error");
      addLog("ERROR: Failed to fetch documents from database.");
    }
  };

  const saveDocument = async (name: string, content: string) => {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, "success");
        addLog(`Document "${name}" created or modified.`);
        fetchDocuments();
        return true;
      } else {
        showNotification(data.error || "Erro ao salvar documento", "error");
        addLog(`ERROR: Failed to save document "${name}".`);
        return false;
      }
    } catch (error) {
      console.error("Error saving doc:", error);
      showNotification("Erro de rede ao salvar documento.", "error");
      addLog(`ERROR: Network timeout on "${name}" saving transaction.`);
      return false;
    }
  };

  const deleteDocument = async (name: string) => {
    if (!confirm(`Tem certeza que deseja deletar o documento "${name}"?`)) return;
    try {
      const res = await fetch(`/api/documents/${name}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, "success");
        addLog(`Document "${name}" deleted.`);
        if (selectedDoc?.name === name) {
          setSelectedDoc(null);
          setIsEditing(false);
        }
        fetchDocuments();
      } else {
        showNotification(data.error || "Erro ao deletar documento", "error");
      }
    } catch (error) {
      console.error("Error deleting doc:", error);
      showNotification("Erro ao deletar documento do servidor.", "error");
      addLog(`ERROR: Failed deletion of "${name}".`);
    }
  };

  const restoreDefaults = async () => {
    if (!confirm("Isso irá restaurar e sobrescrever os 3 documentos originais (Política de Reembolso, Regras de Contrato, FAQ Interno). Deseja continuar?")) {
      return;
    }
    try {
      addLog("Restoring default document templates...");
      for (const doc of DEFAULT_DOCUMENTS) {
        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: doc.name, content: doc.content })
        });
      }
      showNotification("Documentos padrão restaurados com sucesso!", "success");
      addLog("Default templates successfully overwritten and vectorized.");
      fetchDocuments();
      setSelectedDoc(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error restoring defaults:", error);
      showNotification("Erro ao restaurar os documentos padrão.", "error");
      addLog("ERROR: Failed during templates rebuild operation.");
    }
  };

  const handleAsk = async (customQuestion?: string, type: ChatMessage["type"] = "custom") => {
    const q = customQuestion || question;
    if (!q.trim()) return;

    setQuestion("");
    setIsLoading(true);
    setLoadingStep("Recuperando documentos...");
    addLog(`Incoming query: "${q.substring(0, 30)}..." [Type: ${type.toUpperCase()}]`);

    // Simulate RAG steps for premium interface feel
    setTimeout(() => {
      setLoadingStep("Cruzando informações e gerando prompt...");
      addLog("RAG: Context matched. Retreived source chunks. Running synthesizer...");
      setTimeout(() => {
        setLoadingStep("Consultando modelo inteligente (Gemini 3.5 Flash)...");
        addLog("API CALL: Sent payloads to gemini-3.5-flash context API.");
      }, 500);
    }, 400);

    try {
      const res = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();

      if (data.error) {
        showNotification(data.error, "error");
        addLog(`API ERROR: ${data.error}`);
        setChatHistory(prev => [
          {
            id: Date.now().toString(),
            question: q,
            answer: `Erro do servidor: ${data.error}`,
            timestamp: new Date().toLocaleTimeString(),
            type
          },
          ...prev
        ]);
      } else {
        if (data.modelUsed) {
          setEngineUsed(data.modelUsed);
          addLog(`SUCCESS: Response delivered by ${data.modelUsed}.`);
        } else {
          addLog("SUCCESS: Guardrails passed. Response delivered.");
        }
        setChatHistory(prev => [
          {
            id: Date.now().toString(),
            question: q,
            answer: data.answer,
            timestamp: new Date().toLocaleTimeString(),
            type
          },
          ...prev
        ]);
      }
    } catch (error: any) {
      console.error("Error asking:", error);
      showNotification("Falha de rede ao se comunicar com a API.", "error");
      addLog("ERROR: Request transmission interrupted.");
      setChatHistory(prev => [
        {
          id: Date.now().toString(),
          question: q,
          answer: "Erro: Não foi possível se conectar com o servidor. Verifique se o servidor backend está rodando.",
          timestamp: new Date().toLocaleTimeString(),
          type
        },
        ...prev
      ]);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleEditDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setEditContent(doc.content);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    const success = await saveDocument(selectedDoc.name, editContent);
    if (success) {
      setSelectedDoc({ ...selectedDoc, content: editContent });
      setIsEditing(false);
    }
  };

  const handleCreateDoc = async () => {
    if (!newDocName.trim() || !newDocContent.trim()) {
      showNotification("Nome e conteúdo são obrigatórios.", "error");
      return;
    }
    const cleanName = newDocName.endsWith(".txt") ? newDocName : `${newDocName}.txt`;
    const success = await saveDocument(cleanName, newDocContent);
    if (success) {
      setNewDocName("");
      setNewDocContent("");
      setIsCreating(false);
    }
  };

  // Test definitions
  const testCases = {
    crossing: [
      { q: "Posso pedir reembolso após cancelar o contrato?", label: "Reembolso pós-cancelamento" },
      { q: "Qual o prazo de reembolso e como faço a solicitação?", label: "Prazo & Solicitação" },
      { q: "O suporte pode resolver pedidos de reembolso?", label: "Suporte resolve reembolso?" }
    ],
    outOfContext: [
      { q: "Qual é o endereço da empresa?", label: "Endereço corporativo" },
      { q: "Quem é o CEO da empresa?", label: "Quem é o CEO?" },
      { q: "Existe aplicativo mobile?", label: "Aplicativo Mobile" }
    ],
    ambiguous: [
      { q: "Quanto tempo demora?", label: "Quanto tempo demora?" },
      { q: "Posso cancelar?", label: "Posso cancelar?" },
      { q: "Isso tem custo?", label: "Isso tem custo?" }
    ],
    firebaseRAG: [
      { q: "Vocês têm indicação de alguma tapeçaria parceira?", label: "Indicar Tapeçaria" },
      { q: "Qual o telefone e endereço da Loja do Tapeceiro?", label: "Contato Tapeceiro" },
      { q: "Vocês têm algum encanador ou mecânica cadastrada?", label: "Verificar Outros Segmentos" }
    ]
  };

  const currentActiveQuery = chatHistory[0];

  return (
    <div className="h-screen w-full bg-[#0A0C10] text-slate-300 flex flex-col font-sans overflow-hidden select-none">
      {/* Dynamic Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-2xl border ${
              notification.type === "success"
                ? "bg-[#0D1117]/90 border-emerald-500/30 text-emerald-300"
                : "bg-[#0D1117]/90 border-rose-500/30 text-rose-300"
            } backdrop-blur-md`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span className="font-mono text-xs">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Navigation in theme's specific layout */}
      <header className="h-16 border-b border-white/5 bg-[#0D1117] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wider uppercase font-display">
              RAG Engine :: Assistant Lab
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              v1.0.4-alpha // API ENDPOINT: /ask
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex gap-4 text-[10px] font-mono">
            <span className="text-emerald-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              ● ACTIVE
            </span>
            <span className="text-slate-500">LATENCY: {isLoading ? "..." : "42ms"}</span>
            <span className="text-slate-500">TEMP: 0.1</span>
          </div>
          <button
            onClick={restoreDefaults}
            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded text-xs text-white transition-all duration-200 flex items-center gap-1.5 font-mono"
            title="Restaurar base original de conhecimento para testes de sucesso"
          >
            <RefreshCw className="w-3 h-3 text-slate-400" />
            RELOAD TEMPLATES
          </button>
        </div>
      </header>

      {/* Main Container - 3 Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* SIDEBAR LEFT: Knowledge Base */}
        <aside className="w-80 border-r border-white/5 bg-[#0D1117]/50 p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                Knowledge Base (Context)
              </h2>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing(false);
                  setSelectedDoc(null);
                }}
                className="p-1 hover:bg-white/5 border border-white/5 hover:border-white/10 text-indigo-400 hover:text-indigo-300 rounded transition-all"
                title="Adicionar Novo Documento (.txt)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`mb-4 p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 group ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300 scale-[0.98]"
                  : "border-white/10 hover:border-white/25 bg-black/15 text-slate-400 hover:text-slate-200"
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                accept=".txt,.json,.md,.csv,.pdf"
                onChange={handleFileSelect}
              />
              <motion.div
                animate={{ y: isDragging ? [0, -4, 0] : 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <FileCheck className={`w-6 h-6 ${isDragging ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"}`} />
              </motion.div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold tracking-wide">
                  {isDragging ? "Solte para enviar!" : "Upload de Documento"}
                </p>
                <p className="text-[9px] text-slate-500">
                  Arraste .txt, .pdf, .json ou clique aqui
                </p>
              </div>
            </div>

            {/* Document Collection */}
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="p-4 border border-dashed border-white/5 rounded-lg text-center text-xs text-slate-500">
                  Sem documentos. Clique em "RELOAD TEMPLATES" no topo para reestabelecer.
                </div>
              ) : (
                documents.map((doc) => {
                  const isSelected = selectedDoc?.name === doc.name;
                  return (
                    <div
                      key={doc.name}
                      onClick={() => handleEditDoc(doc)}
                      className={`group p-3.5 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? "bg-indigo-500/10 border-indigo-500/40 text-slate-200"
                          : "bg-white/5 border-white/10 hover:border-white/20 text-slate-400"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-200 italic font-mono truncate max-w-[140px]">
                          {doc.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            doc.content.length > 50 
                              ? "bg-indigo-500/20 text-indigo-400" 
                              : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {doc.content.length > 50 ? "VECTORIZED" : "INDEXING"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDocument(doc.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-all"
                            title="Remover documento"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                        {doc.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Firebase Contacts List (RAG Source) */}
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Firebase Contacts (RAG)
                </h2>
                <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  {contacts.length} CADASTROS
                </span>
              </div>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {contacts.length === 0 ? (
                  <div className="p-4 border border-dashed border-white/5 rounded-lg text-center text-xs text-slate-500">
                    Carregando base do Firebase...
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div 
                      key={contact.id} 
                      className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col gap-1.5 text-[11px]"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-slate-200 truncate">{contact.name}</span>
                        <span className="text-[8px] uppercase tracking-wider font-mono text-slate-400 px-1.5 py-0.5 rounded bg-indigo-500/10 shrink-0">
                          {contact.segmento}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-mono text-[10px]">{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 leading-tight">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-[10px] truncate" title={contact.endereco}>{contact.endereco}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RAG Stat Widget at the bottom */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20">
              <p className="text-[11px] text-indigo-300 font-medium mb-1.5 flex items-center justify-between">
                <span>RAG Metrics</span>
                <span className="text-[9px] text-slate-500 font-mono">STANDALONE</span>
              </p>
              <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (documents.length / 5) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2.5 font-mono text-[9px] text-slate-500">
                <span>DOCS: {documents.length}</span>
                <span>CHUNKS: {documents.length * 4}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTRAL PANEL: Main Playground Interaction */}
        <section className="flex-1 flex flex-col p-6 bg-[#0A0C10] overflow-hidden">
          <div className="flex-1 flex flex-col border border-white/5 rounded-2xl bg-[#0D1117] overflow-hidden shadow-2xl">
            
            {/* Header info bar */}
            <div className="p-4 border-b border-white/5 bg-black/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20 rounded">
                  POST
                </span>
                <span className="text-xs font-mono text-slate-400">/ask</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-[10px] font-mono text-slate-500">REALTIME RAG INFERENCE</span>
              </div>
            </div>

            {/* Playground Interaction Workspace */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              
              {/* Box 1: Input JSON Representation */}
              <div className="space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <FileJson className="w-3 h-3 text-indigo-400" />
                    Input payload (JSON)
                  </label>
                  {isLoading && (
                    <span className="text-[10px] font-mono text-indigo-400 animate-pulse">
                      Processing query...
                    </span>
                  )}
                </div>
                <div className="bg-black/50 p-4 rounded-lg border border-white/5 font-mono text-xs leading-relaxed text-indigo-300">
                  <div>{"{"}</div>
                  <div className="pl-4">
                    "question": <span className="text-emerald-400">"{currentActiveQuery ? currentActiveQuery.question : question || "Aguardando entrada..."}"</span>
                  </div>
                  <div>{"}"}</div>
                </div>
              </div>

              {/* Box 2: System Response (RAG Augmented Output) */}
              <div className="flex-1 flex flex-col space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  System response (RAG Augmented Output)
                </label>
                <div className="flex-1 bg-[#0A0C10]/40 p-5 rounded-lg border border-white/5 text-slate-300 leading-relaxed text-xs overflow-y-auto flex flex-col justify-between">
                  
                  {/* Current Active Response */}
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 font-mono text-[11px] animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{loadingStep}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3.5 bg-white/5 rounded w-[90%] animate-pulse"></div>
                          <div className="h-3.5 bg-white/5 rounded w-[80%] animate-pulse"></div>
                          <div className="h-3.5 bg-white/5 rounded w-[60%] animate-pulse"></div>
                        </div>
                      </div>
                    ) : currentActiveQuery ? (
                      <div className="space-y-3">
                        {currentActiveQuery.type && currentActiveQuery.type !== "custom" && (
                          <div className="flex items-center gap-2">
                            {currentActiveQuery.type === "crossing" && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                                🟠 Cruzamento de Dados Confirmado
                              </span>
                            )}
                            {currentActiveQuery.type === "out_of_context" && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                                🔴 Fora do Contexto Rejeitado
                              </span>
                            )}
                            {currentActiveQuery.type === "ambiguous" && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/25">
                                🧠 Análise de Ambiguidade Mapeada
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-slate-200 leading-relaxed italic text-sm">
                          "{currentActiveQuery.answer}"
                        </p>
                      </div>
                    ) : (
                      <div className="text-slate-500 flex flex-col items-center justify-center py-10 text-center space-y-2">
                        <HelpCircle className="w-8 h-8 text-slate-700 animate-pulse" />
                        <p>Nenhuma pergunta processada ainda.</p>
                        <p className="text-[10px] text-slate-600 max-w-xs">
                          Selecione um caso de teste ao lado ou envie uma pergunta no chat abaixo para ver o RAG atuando.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tiny meta tag */}
                  {currentActiveQuery && !isLoading && (
                    <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>STRICT RAG EVALUATION</span>
                      <span>{currentActiveQuery.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 3: History list (collapsible or scroll list) */}
              {chatHistory.length > 1 && (
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      Response Logs ({chatHistory.length - 1} previous)
                    </span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-2 pr-1.5">
                    {chatHistory.slice(1).map((hist, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-black/25 border border-white/5 text-[11px] flex justify-between gap-3 text-slate-400 hover:text-slate-300">
                        <span className="truncate italic flex-1">"Q: {hist.question}" &rarr; {hist.answer}</span>
                        <span className="font-mono text-[9px] text-slate-600 shrink-0">{hist.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Manual Prompt Bar */}
            <div className="h-20 border-t border-white/5 bg-black/20 flex items-center px-6 gap-4 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="w-full flex items-center gap-4"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Faça uma pergunta manual baseada nos documentos..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-slate-600 font-sans"
                />
                <button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-40 font-mono tracking-wider flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  SEND REQUEST
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* SIDEBAR RIGHT: Test Battery */}
        <aside className="w-80 border-l border-white/5 bg-[#0D1117]/50 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Test Suite Battery
            </h2>

            <div className="space-y-4">
              {/* Crossing Info */}
              <div>
                <p className="text-[10px] font-bold text-amber-500 mb-2 tracking-wider flex items-center gap-1.5 font-mono">
                  <span>🟠 CROSS-REFERENCING</span>
                </p>
                <div className="space-y-1.5">
                  {testCases.crossing.map((tc, index) => (
                    <button
                      key={index}
                      onClick={() => handleAsk(tc.q, "crossing")}
                      disabled={isLoading}
                      className="w-full text-left p-2.5 rounded bg-white/5 hover:bg-white/10 text-[10px] border border-white/5 hover:border-white/10 transition-all text-slate-400 hover:text-slate-200 font-mono leading-normal"
                    >
                      {tc.q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Out of Context */}
              <div>
                <p className="text-[10px] font-bold text-rose-500 mb-2 tracking-wider flex items-center gap-1.5 font-mono">
                  <span>🔴 OUT OF CONTEXT</span>
                </p>
                <div className="space-y-1.5">
                  {testCases.outOfContext.map((tc, index) => (
                    <button
                      key={index}
                      onClick={() => handleAsk(tc.q, "out_of_context")}
                      disabled={isLoading}
                      className="w-full text-left p-2.5 rounded bg-white/5 hover:bg-white/10 text-[10px] border border-white/5 hover:border-white/10 transition-all text-slate-400 hover:text-slate-200 font-mono leading-normal"
                    >
                      {tc.q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambiguous */}
              <div>
                <p className="text-[10px] font-bold text-sky-400 mb-2 tracking-wider flex items-center gap-1.5 font-mono">
                  <span>🧠 AMBIGUOUS</span>
                </p>
                <div className="space-y-1.5">
                  {testCases.ambiguous.map((tc, index) => (
                    <button
                      key={index}
                      onClick={() => handleAsk(tc.q, "ambiguous")}
                      disabled={isLoading}
                      className="w-full text-left p-2.5 rounded bg-white/5 hover:bg-white/10 text-[10px] border border-white/5 hover:border-white/10 transition-all text-slate-400 hover:text-slate-200 font-mono leading-normal"
                    >
                      {tc.q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Firebase Contacts RAG */}
              <div>
                <p className="text-[10px] font-bold text-emerald-400 mb-2 tracking-wider flex items-center gap-1.5 font-mono">
                  <span>🟢 FIREBASE RAG</span>
                </p>
                <div className="space-y-1.5">
                  {testCases.firebaseRAG.map((tc, index) => (
                    <button
                      key={index}
                      onClick={() => handleAsk(tc.q, "custom")}
                      disabled={isLoading}
                      className="w-full text-left p-2.5 rounded bg-white/5 hover:bg-white/10 text-[10px] border border-white/5 hover:border-white/10 transition-all text-slate-400 hover:text-slate-200 font-mono leading-normal"
                    >
                      {tc.q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Log */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Validation Log</span>
              <span className="text-[10px] text-indigo-400 animate-pulse font-mono">AUTO-REFRESH ON</span>
            </div>
            <div className="font-mono text-[9px] space-y-1 text-slate-600 max-h-32 overflow-y-auto pr-1">
              {logs.map((log, index) => (
                <p key={index} className={log.includes("ERROR") ? "text-rose-500/70" : log.includes("SUCCESS") || log.includes("ACTIVE") ? "text-emerald-500/70" : ""}>
                  {log}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-[#0D1117] border-t border-white/5 flex items-center px-6 justify-between text-[10px] font-mono text-slate-500 shrink-0">
        <div className="flex gap-6">
          <span>ENGINE: {engineUsed.toUpperCase()}</span>
          <span>DB: LOCAL_VIRTUAL_VECTOR_STORE</span>
          <span>REGION: us-west2</span>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
            SYSTEM NOMINAL
          </span>
        </div>
      </footer>

      {/* MODAL: EDIT/CREATE KNOWLEDGE SOURCE */}
      <AnimatePresence>
        {(isEditing || isCreating) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEditing(false);
                setIsCreating(false);
                setSelectedDoc(null);
              }}
              className="absolute inset-0 bg-[#0A0C10]/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#0D1117] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/10">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                    {isEditing ? `Edit Source: ${selectedDoc?.title}` : "Create New Document Segment"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    setSelectedDoc(null);
                  }}
                  className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isCreating && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                      Filename (e.g. politica_reembolso.txt)
                    </label>
                    <input
                      type="text"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      placeholder="politica_privacidade.txt"
                      className="w-full bg-[#0A0C10] border border-white/10 text-xs font-mono text-slate-200 rounded p-2.5 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-[260px]">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                    Source text content
                  </label>
                  <textarea
                    value={isEditing ? editContent : newDocContent}
                    onChange={(e) => isEditing ? setEditContent(e.target.value) : setNewDocContent(e.target.value)}
                    placeholder="Cole ou insira novas regras de conhecimento aqui..."
                    className="w-full flex-1 bg-[#0A0C10] border border-white/10 text-xs font-mono text-slate-200 rounded p-3 focus:outline-none focus:border-indigo-500 resize-none h-full"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/5 bg-black/20 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    setSelectedDoc(null);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[11px] font-mono text-slate-300 hover:text-white transition"
                >
                  CANCEL
                </button>
                {isEditing ? (
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono rounded transition shadow-md shadow-indigo-600/10"
                  >
                    SAVE SOURCE
                  </button>
                ) : (
                  <button
                    onClick={handleCreateDoc}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono rounded transition shadow-md shadow-indigo-600/10"
                  >
                    INDEX DOCUMENT
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
