// const endpoint = "https://snc-openai-ia-gtde-prd.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01";
// const apiKey = "3b18516da9cd48e2bb37a09354547ab3";


// const RETRY_DELAYS = [1000, 2000, 4000];
// const MAX_RETRIES = 3;


// let documentsCache = null;
// let processedDocuments = new Set();


// const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// const requestMonitor = {
//     requests: [],
//     maxLogSize: 100,

//     logRequest(endpoint, requestType, status, timestamp) {
//         this.requests.push({
//             endpoint,
//             requestType,
//             status,
//             timestamp
//         });

      
//         if (this.requests.length > this.maxLogSize) {
//             this.requests.shift();
//         }

     
//         console.log(`[${timestamp.toISOString()}] ${requestType} to ${endpoint} - Status: ${status}`);
//     },

//     getRequestStats() {
//         const now = Date.now();
//         const lastMinute = this.requests.filter(r => (now - r.timestamp) < 60000);
//         const lastHour = this.requests.filter(r => (now - r.timestamp) < 3600000);

//         return {
//             totalRequests: this.requests.length,
//             requestsLastMinute: lastMinute.length,
//             requestsLastHour: lastHour.length,
//             errorRequests: this.requests.filter(r => r.status >= 400).length
//         };
//     },

//     printStats() {
//         const stats = this.getRequestStats();
//         console.log('=== Request Statistics ===');
//         console.log(`Total requests: ${stats.totalRequests}`);
//         console.log(`Requests in last minute: ${stats.requestsLastMinute}`);
//         console.log(`Requests in last hour: ${stats.requestsLastHour}`);
//         console.log(`Error requests: ${stats.errorRequests}`);
//         console.log('=====================');
//     }
// };


// async function makeAPIRequest(endpoint, headers, body, retryCount = 0) {
//     try {
//         const startTime = new Date();
//         requestMonitor.logRequest(endpoint, 'START', 'pending', startTime);

//         const response = await fetch(endpoint, {
//             method: "POST",
//             headers: headers,
//             body: body
//         });

//         requestMonitor.logRequest(endpoint, 'COMPLETE', response.status, new Date());

//         if (response.status === 429 && retryCount < MAX_RETRIES) {
//             const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
//             console.log(`Rate limit hit (429) - Attempt ${retryCount + 1}/${MAX_RETRIES}`);
//             console.log(`Waiting ${delay}ms before retry...`);
//             requestMonitor.printStats(); 
//             await wait(delay);
//             return makeAPIRequest(endpoint, headers, body, retryCount + 1);
//         }

//         if (!response.ok) {
//             throw new Error(`API Error: ${response.status} ${response.statusText}`);
//         }

//         return response.json();
//     } catch (error) {
//         requestMonitor.logRequest(endpoint, 'ERROR', error.message, new Date());
        
//         if (retryCount < MAX_RETRIES) {
//             const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
//             console.log(`Request failed - Attempt ${retryCount + 1}/${MAX_RETRIES}`);
//             console.log(`Error: ${error.message}`);
//             console.log(`Waiting ${delay}ms before retry...`);
//             await wait(delay);
//             return makeAPIRequest(endpoint, headers, body, retryCount + 1);
//         }
//         throw error;
//     }
// }


// async function loadBaseDocuments() {
//     if (documentsCache) {
//         return documentsCache;
//     }

//     try {
//         const response = await fetch('documentos.json');
//         if (!response.ok) {
//             throw new Error('Erro ao carregar o arquivo JSON');
//         }
//         const text = await response.text();
//         documentsCache = JSON.parse(text);
        
//         documentsCache.documentos.forEach(doc => {
//             processedDocuments.add(doc.nome);
//         });

//         await updateDocumentsDisplay();
//         return documentsCache;
//     } catch (error) {
//         console.error('Erro ao carregar documentos base:', error);
//         throw error;
//     }
// }


// async function updateDocumentsDisplay() {
//     const container = document.getElementById('documentosCheckboxes');
//     if (!container) return;

//     container.innerHTML = `
//         <h3 class="row d-flex justify-content-center">Documentos referenciais para análise</h3>
//         <p class="row d-flex justify-content-center text-muted">
//             Os seguintes documentos serão utilizados como base para a análise do plano de curso:
//         </p>
//         <div id="documentsList" class="mt-3"></div>
//         <div id="uploadedDocuments" class="mt-3">
//             <h4>Documentos Complementares Carregados:</h4>
//             <p class="text-muted">Documentos adicionais carregados para complementar a análise</p>
//         </div>
//     `;

//     const documentsList = document.getElementById('documentsList');
    
//     if (documentsCache && documentsCache.documentos) {
//         documentsCache.documentos.forEach(doc => {
//             const docElement = document.createElement('div');
//             docElement.className = 'mb-3 p-3 border rounded';
//             docElement.innerHTML = `
//                 <h5>${doc.nome}</h5>
//                 <p class="text-muted small">Documento referencial incluído na análise</p>
//             `;
//             documentsList.appendChild(docElement);
//         });
//     }
// }


// async function adicionarPDF() {
//     const input = document.getElementById("uploadPDF");
//     if (!input.files.length) {
//         alert("Selecione um ou mais arquivos PDF.");
//         return;
//     }

//     const uploadedDocsContainer = document.getElementById('uploadedDocuments');

//     for (let file of input.files) {
//         if (processedDocuments.has(file.name)) {
//             console.log(`Documento ${file.name} já foi processado anteriormente.`);
//             continue;
//         }

//         try {
//             const texto = await extrairTextoPDF(file);
            
//             const docElement = document.createElement('div');
//             docElement.className = 'mb-3 p-3 border rounded';
//             docElement.innerHTML = `
//                 <h5>${file.name}</h5>
//                 <p class="text-muted small">Documento complementar carregado</p>
//             `;
//             uploadedDocsContainer.appendChild(docElement);

//             if (!documentsCache.documentos.find(d => d.nome === file.name)) {
//                 documentsCache.documentos.push({
//                     nome: file.name,
//                     conteudo: texto
//                 });
//                 processedDocuments.add(file.name);
//             }
//         } catch (error) {
//             console.error(`Erro ao processar ${file.name}:`, error);
//         }
//     }

//     input.value = '';
// }


// async function extrairTextoPDF(file) {
//     if (!(file instanceof Blob)) {
//         throw new Error("Arquivo inválido");
//     }

//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = async function() {
//             try {
//                 const typedArray = new Uint8Array(this.result);
//                 const pdf = await pdfjsLib.getDocument(typedArray).promise;
//                 let texto = "";
                
//                 const pages = await Promise.all(
//                     Array.from({length: pdf.numPages}, (_, i) => 
//                         pdf.getPage(i + 1).then(page => page.getTextContent())
//                     )
//                 );
                
//                 texto = pages
//                     .flatMap(content => content.items.map(item => item.str))
//                     .join(" ");
                
//                 resolve(texto);
//             } catch (error) {
//                 reject(error);
//             }
//         };
//         reader.onerror = reject;
//         reader.readAsArrayBuffer(file);
//     });
// }


// async function processarPlanoCurso() {
//     const input = document.getElementById("planoCurso");
//     if (!input.files.length) {
//         alert("Por favor, selecione um arquivo PDF.");
//         return;
//     }

//     console.log('=== Starting new analysis ===');
//     console.log('Current request statistics:');
//     requestMonitor.printStats();

//     document.getElementById("loading").style.display = "block";
//     document.getElementById("resultado").innerHTML = "Iniciando análise...";

//     try {
//         if (!documentsCache) {
//             console.log('Loading base documents...');
//             await loadBaseDocuments();
//         }

//         console.log('Extracting PDF text...');
//         const textoPlano = await extrairTextoPDF(input.files[0]);
//         console.log('PDF text extracted successfully');
        
   
//         console.log(`PDF text length: ${textoPlano.length} characters`);
//         console.log(`Number of base documents: ${documentsCache.documentos.length}`);

//         const baseConhecimento = JSON.stringify({ 
//             documentos: documentsCache.documentos 
//         });

//         const txtprompt = document.getElementById("textoprompt");
//         const prompt = txtprompt.value;
        
//         console.log('Preparing API request...');
//         const body = JSON.stringify({
//             "messages": [
//                 {
//                     "role": "system",
//                     "content": "Você é um especialista em formação profissional, com enfase em análise curricular, considerando o cenário brasileiro."
//                 },
//                 {
//                     "role": "user",
//                     "content": `${prompt} Utilize para análise o Texto do Plano de Curso: ${textoPlano} Utilize a seguinte base de conhecimento que contém documentos norteadores sobre o modelo pedagógico do senac, metodologias modernas de práticas de ensino com orientações metodológicas e impacto da automação específico do curso que está sendo analisado: ${baseConhecimento} Liste e explique como utilizou cada um dos documentos carregados pelo usuário. O RESULTADO DEVE SER EM FORMATO DE HTML5 E NO RODAPÉ DO RELATORIO ESCREVA: DESENVOLVIDO POR SENAC DEPARTAMENTO NACIONAL - GER. DE TECNOLOGIAS E DESENHOS EDUCACIONAIS.`
//                 }
//             ]
//         });

     
//         console.log(`Request body size: ${body.length} characters`);

//         const headers = {
//             "Content-Type": "application/json",
//             "api-key": apiKey
//         };

//         console.log('Sending API request...');
//         const data = await makeAPIRequest(endpoint, headers, body);

//         document.getElementById("loading").style.display = "none";

//         if (data.choices && data.choices.length > 0) {
//             console.log('Analysis completed successfully');
//             exibirRelatorio(data.choices[0].message.content);
//             document.getElementById("exportarBtn").style.display = "block";
//         } else {
//             console.log('No response data received');
//             document.getElementById("resultado").innerHTML = "Nenhuma resposta recebida.";
//         }
//     } catch (error) {
//         console.error('Error processing course plan:', error);
//         document.getElementById("loading").style.display = "none";
//         document.getElementById("resultado").innerHTML = `Erro ao processar o plano de curso: ${error.message}`;
//     } finally {
//         console.log('=== Analysis process completed ===');
//         requestMonitor.printStats();
//     }
// }


// function exibirRelatorio(relatorio) {
//     const elemento = document.getElementById("resultado");
//     elemento.innerHTML = relatorio;
//     const imprimirBtn = document.getElementById("imprimirBtn");
//     imprimirBtn.classList.remove("invisible");
//     imprimirBtn.style.display = "block";
// }


// async function exportarPDF() {
//     const elemento = document.getElementById("resultado");
//     const doc = new jspdf.jsPDF({
//         orientation: "portrait",
//         unit: "mm",
//         format: "a4"
//     });
    
//     let texto = elemento.innerHTML || elemento.textContent;
//     let margemEsquerda = 10;
//     let margemTopo = 10;
//     let larguraMaxima = 180;

//     doc.setFont("Times", "normal");
//     doc.setFontSize(12);
//     doc.text(texto, margemEsquerda, margemTopo, { maxWidth: larguraMaxima });
    
//     doc.save("relatorio-analise.pdf");
// }


// function btnImprimir() {
//     const textopromptContent = document.getElementById('textoprompt').value;
//     const resultadoContent = document.getElementById('resultado').innerHTML;

//     const printWindow = window.open('', '', 'height=600,width=800');
//     printWindow.document.write('<html><head><title>Relatório de Análise PCN</title>');
//     printWindow.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css">');
//     printWindow.document.write('</head><body>');
//     printWindow.document.write('<h1 class="display-6 mb-0" style="margin-left: 27rem;">Avaliação de Plano de Curso com Inteligência Artificial (v1)</h1>');
//     printWindow.document.write('<h2>Conteúdo do Prompt:</h2>');
//     printWindow.document.write('<pre>' + textopromptContent + '</pre>');
//     printWindow.document.write('<h2 style="text-align: center;">Resultado da Análise:</h2>');
//     printWindow.document.write(resultadoContent);
//     printWindow.document.write('</body></html>');
//     printWindow.document.close();
//     printWindow.print();
// }

// window.onload = async function() {
//     pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
//     await loadBaseDocuments();
// };


// $(document).ready(function() {
//     $('textarea').on('keyup keypress', function() {
//         $(this).height(0);
//         $(this).height(this.scrollHeight);
//     });
// });