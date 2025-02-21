// Configuração do endpoint e API key
const endpoint = "https://snc-openai-ia-gtde-prd.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01";
const apiKey = "3b18516da9cd48e2bb37a09354547ab3";

// PDFs base do sistema
const basePDFs = [
  "MetodologiasCubos.pdf",
  "impactodaAutomacao.pdf",
  "guia_pratica_docente_MPS.pdf",
  "Guia_Elaboracao_PCs_fev_2023.pdf",
  "Diretrizes-MPS-2024.pdf",
  "DocTec3_Planejamento_2022.pdf"
];

// Variável para armazenar os arquivos convertidos
const arquivosConvertidos = [];
let documentosBase = [];

// Função para truncar o texto (limita a um tamanho máximo)
function truncarTexto(texto, maxLength = 10000) {
  if (texto.length > maxLength) {
    return texto.substring(0, maxLength) + '...';
  }
  return texto;
}

// Extrai texto de um PDF a partir de um Blob
async function extrairTextoPDF(fileBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function() {
      try {
        const typedArray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const pages = await Promise.all(
          Array.from({length: pdf.numPages}, (_, i) =>
            pdf.getPage(i + 1).then(page => page.getTextContent())
          )
        );
        const texto = pages
          .flatMap(content => content.items.map(item => item.str))
          .join(" ");
        resolve(texto);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(fileBlob);
  });
}

// Carrega e extrai texto de todos os PDFs base
async function carregarDocumentosBase() {
  const documentos = [];
  for (const caminho of basePDFs) {
    try {
      const response = await fetch(caminho);
      if (!response.ok) throw new Error(`Não foi possível carregar ${caminho}`);
      const blob = await response.blob();
      const texto = await extrairTextoPDF(blob);
      documentos.push({
        nome: caminho,
        conteudo: texto
      });
    } catch (error) {
      console.error(`Erro ao processar PDF base ${caminho}:`, error);
    }
  }
  return documentos;
}

// Adicionar novo PDF
async function adicionarPDF() {
  const input = document.getElementById("uploadPDF");
  if (!input.files.length) {
    alert("Selecione um ou mais arquivos PDF.");
    return;
  }

  for (let file of input.files) {
    try {
      const texto = await extrairTextoPDF(file);
      const novoArquivo = {
        nome: file.name,
        conteudo: texto
      };
      
      // Verificar se o arquivo já existe
      const arquivoExistente = arquivosConvertidos.find(a => a.nome === file.name);
      if (!arquivoExistente) {
        arquivosConvertidos.push(novoArquivo);
        atualizarListaDocumentosCarregados();
      }
    } catch (error) {
      console.error(`Erro ao processar ${file.name}:`, error);
    }
  }
}

// Atualiza a lista de documentos carregados na interface
function atualizarListaDocumentosCarregados() {
  const lista = document.getElementById("documentosCarregados");
  lista.innerHTML = "";
  arquivosConvertidos.forEach(doc => {
    const li = document.createElement("li");
    li.textContent = doc.nome;
    lista.appendChild(li);
  });
}

// Processa o PDF do plano de curso e faz a chamada única para a IA
async function processarPlanoCurso() {
  const input = document.getElementById("planoCurso");
  const txtprompt = document.getElementById("textoprompt");
  
  if (!input.files.length) {
    alert("Por favor, selecione um arquivo PDF.");
    return;
  }
  
  document.getElementById("loading").style.display = "block";
  document.getElementById("resultado").innerHTML = "Iniciando análise...";

  try {
    // Extrai texto do PDF do usuário
    const userFile = input.files[0];
    const textoPlano = await extrairTextoPDF(userFile);

    // Adiciona os documentos carregados pelo usuário
    const documentosUsuario = arquivosConvertidos.map(doc => ({
      nome: doc.nome,
      conteudo: doc.conteudo
    }));

    // Junta todos os documentos em uma única base de conhecimento
    // Truncamos cada conteúdo para limitar o tamanho do payload
    const todosDocumentos = [...documentosBase, ...documentosUsuario, { nome: userFile.name, conteudo: textoPlano }];
    const documentosParaEnvio = todosDocumentos.map(doc => ({
      nome: doc.nome,
      conteudo: truncarTexto(doc.conteudo, 10000)
    }));
    const baseConhecimento = JSON.stringify({ documentos: documentosParaEnvio });
    const prompt = txtprompt.value;

    // Monta corpo do request
    const requestBody = JSON.stringify({
      "messages": [
        {
          "role": "system",
          "content": "Você é um especialista em formação profissional, com ênfase em análise curricular, considerando o cenário brasileiro."
        },
        {
          "role": "user",
          "content": `${prompt} Utilize a seguinte base de conhecimento que contém documentos norteadores: ${baseConhecimento}. Liste como utilizou cada arquivo dos documentos base em sua análise. O RESULTADO DEVE SER EM FORMATO DE HTML5 E NO RODAPÉ DO RELATORIO ESCREVA: DESENVOLVIDO POR SENAC DEPARTAMENTO NACIONAL - GER. DE TECNOLOGIAS E DESENHOS EDUCACIONAIS.`
        }
      ]
    });

    // Chamada única à API
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: requestBody
    });

    document.getElementById("loading").style.display = "none";
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      exibirRelatorio(data.choices[0].message.content);
      document.getElementById("exportarBtn").style.display = "block";
    } else {
      document.getElementById("resultado").innerHTML = "Nenhuma resposta recebida.";
    }
  } catch (error) {
    console.error("Erro ao processar o plano de curso:", error);
    document.getElementById("loading").style.display = "none";
    document.getElementById("resultado").innerHTML =
      `Erro ao processar o plano de curso: ${error.message}`;
  }
}

// Exibe o relatório na tela
function exibirRelatorio(relatorio) {
  const cleanedRelatorio = relatorio.replace(/```html/g, '').replace(/```/g, '');
  const elemento = document.getElementById("resultado");
  elemento.innerHTML = cleanedRelatorio;
  
  const imprimirBtn = document.getElementById("imprimirBtn");
  imprimirBtn.classList.remove("invisible");
  imprimirBtn.style.display = "block";
}

// Exportar relatório em PDF
async function exportarPDF() {
  const elemento = document.getElementById("resultado");
  const doc = new jspdf.jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  
  let texto = elemento.innerHTML || elemento.textContent;
  let margemEsquerda = 10;
  let margemTopo = 10;
  let larguraMaxima = 180;

  doc.setFont("Times", "normal");
  doc.setFontSize(12);
  doc.text(texto, margemEsquerda, margemTopo, { maxWidth: larguraMaxima });
  
  doc.save("relatorio-analise.pdf");
}

function btnImprimir() {
  const textopromptContent = document.getElementById('textoprompt').value;
  const resultadoContent = document.getElementById('resultado').innerHTML;

  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write('<html><head><title>Relatório de Análise PCN</title>');
  printWindow.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css">');
  printWindow.document.write('</head><body>');
  printWindow.document.write('<h1 class="display-6 mb-0" style="margin-left: 27rem;">Avaliação de Plano de Curso com Inteligência Artificial (v1)</h1>');
  printWindow.document.write('<h2>Conteúdo do Prompt:</h2>');
  printWindow.document.write('<pre>' + textopromptContent + '</pre>');
  printWindow.document.write('<h2 style="text-align: center;">Resultado da Análise:</h2>');
  printWindow.document.write(resultadoContent);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

// Inicialização
window.onload = async function() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
  documentosBase = await carregarDocumentosBase();
};