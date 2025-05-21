const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Gera um PDF dinâmico de duas páginas com receita médica e instruções de uso
 * @param {Object} patientData - Dados do paciente
 * @param {Object} medicationData - Dados do medicamento
 * @param {Object} instructionsData - Dados das instruções de uso
 * @returns {Promise<Buffer>} - Buffer do PDF gerado
 */
async function generatePrescriptionPDF(patientData, medicationData, instructionsData) {
  try {
    // Lê o template HTML
    const templatePath = path.join(__dirname, 'receita_template.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // Substitui os placeholders com os dados do paciente
    htmlTemplate = htmlTemplate.replace('{{NOME_PACIENTE}}', patientData.nome || 'Nome não informado');
    htmlTemplate = htmlTemplate.replace('{{CPF_PACIENTE}}', patientData.cpf || 'CPF não informado');
    htmlTemplate = htmlTemplate.replace('{{ENDERECO_PACIENTE}}', patientData.endereco || 'Endereço não informado');
    htmlTemplate = htmlTemplate.replace('{{TELEFONE_PACIENTE}}', patientData.telefone || 'Telefone não informado');
    htmlTemplate = htmlTemplate.replace('{{EMAIL_PACIENTE}}', patientData.email || 'Email não informado');
    
    // Substitui os placeholders com os dados do medicamento
    htmlTemplate = htmlTemplate.replace(/{{NOME_MEDICAMENTO}}/g, medicationData.nome || 'Medicamento não informado');
    htmlTemplate = htmlTemplate.replace(/{{DOSAGEM_MEDICAMENTO}}/g, medicationData.dosagem || '');
    htmlTemplate = htmlTemplate.replace('{{QUANTIDADE_MEDICAMENTO}}', medicationData.quantidade || '');
    htmlTemplate = htmlTemplate.replace('{{POSOLOGIA_MEDICAMENTO}}', medicationData.posologia || 'Posologia não informada');
    
    // Substitui os placeholders com os dados das instruções
    htmlTemplate = htmlTemplate.replace('{{COMO_USAR}}', instructionsData.comoUsar || 'Informação não disponível');
    htmlTemplate = htmlTemplate.replace('{{PARA_QUE_SERVE}}', instructionsData.paraQueServe || 'Informação não disponível');
    htmlTemplate = htmlTemplate.replace('{{EFEITO_DESEJADO}}', instructionsData.efeitoDesejado || 'Informação não disponível');
    htmlTemplate = htmlTemplate.replace('{{QUANDO_PROCURAR_MEDICO}}', instructionsData.quandoProcurarMedico || 'Informação não disponível');
    
    // Substitui os placeholders de data e ano
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const anoAtual = new Date().getFullYear();
    htmlTemplate = htmlTemplate.replace('{{DATA_ATUAL}}', dataAtual);
    htmlTemplate = htmlTemplate.replace('{{ANO_ATUAL}}', anoAtual);
    
    // Substitui os placeholders de imagens
    // Nota: Em produção, estas URLs devem apontar para arquivos reais
    const logoPath = path.join(__dirname, 'assets/logo.png'); // Caminho para o logo
    const signaturePath = path.join(__dirname, 'assets/signature.png'); // Caminho para a assinatura
    
    // Verifica se os arquivos existem e usa caminhos relativos ou URLs absolutas
    const logoExists = fs.existsSync(logoPath);
    const signatureExists = fs.existsSync(signaturePath);
    
    const logoUrl = logoExists ? `file://${logoPath}` : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const signatureUrl = signatureExists ? `file://${signaturePath}` : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    
    htmlTemplate = htmlTemplate.replace('LOGO_URL_PLACEHOLDER', logoUrl);
    htmlTemplate = htmlTemplate.replace('SIGNATURE_URL_PLACEHOLDER', signatureUrl);
    
    // Salva o HTML preenchido temporariamente
    const tempHtmlPath = path.join(__dirname, 'temp_prescription.html');
    fs.writeFileSync(tempHtmlPath, htmlTemplate);
    
    // Inicia o Puppeteer para gerar o PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Carrega o HTML
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
    
    // Gera o PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });
    
    // Fecha o navegador
    await browser.close();
    
    // Remove o arquivo HTML temporário
    fs.unlinkSync(tempHtmlPath);
    
    return pdfBuffer;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}

/**
 * Mapeamento de produtos para instruções de uso
 */
const produtoInstrucoes = {
  "Dutasterida 0,5 mg": {
    comoUsar: "Tomar 1 cápsula por via oral, uma vez ao dia, no mesmo horário, com ou sem alimentos.",
    paraQueServe: "Inibe a enzima 5-alfa-redutase, reduzindo os níveis de DHT. Indicado para alopecia androgenética masculina.",
    efeitoDesejado: "Redução progressiva da queda de cabelo e aumento da densidade capilar após 3 a 6 meses.",
    quandoProcurarMedico: "Alterações hormonais, sensibilidade mamária, disfunção sexual ou sintomas depressivos."
  },
  "Finasterida 1 mg": {
    comoUsar: "Tomar 1 comprimido por via oral, uma vez ao dia, com ou sem alimentos.",
    paraQueServe: "Inibidor da 5-alfa-redutase. Reduz a queda de cabelo e estimula o crescimento capilar na alopecia androgenética.",
    efeitoDesejado: "Redução da queda e crescimento de novos fios geralmente observados entre 3 a 6 meses.",
    quandoProcurarMedico: "Disfunção erétil, diminuição da libido ou alterações no humor."
  },
  "Minoxidil Oral 3 mg": {
    comoUsar: "Tomar 1 comprimido por via oral ao dia, com ou sem alimentos, conforme orientação médica.",
    paraQueServe: "Vasodilatador utilizado na alopecia androgenética. Estimula crescimento capilar e melhora a vascularização dos folículos.",
    efeitoDesejado: "Espessamento dos fios e aumento da densidade capilar após 2 a 4 meses.",
    quandoProcurarMedico: "Taquicardia, retenção de líquidos, ganho de peso, crescimento excessivo de pelos no corpo."
  }
};

/**
 * Função para obter instruções de uso com base no nome do produto
 * @param {string} productName - Nome do produto
 * @returns {Object} - Instruções de uso do produto
 */
function getInstructionsForProduct(productName) {
  // Verifica se o produto existe no mapeamento
  if (produtoInstrucoes[productName]) {
    return produtoInstrucoes[productName];
  }
  
  // Caso o produto não seja encontrado, retorna instruções genéricas
  return {
    comoUsar: "Siga as instruções do seu médico para o uso correto deste medicamento.",
    paraQueServe: "Este medicamento foi prescrito especificamente para o seu tratamento.",
    efeitoDesejado: "Os resultados podem variar de acordo com o tratamento e resposta individual.",
    quandoProcurarMedico: "Procure seu médico se apresentar qualquer efeito colateral ou se sua condição não melhorar."
  };
}

/**
 * Função para gerar PDF de teste com dados fictícios
 */
async function generateTestPDF() {
  // Dados fictícios do paciente
  const patientData = {
    nome: "João da Silva",
    cpf: "123.456.789-00",
    endereco: "Rua Exemplo, 123 - São Paulo/SP",
    telefone: "(11) 98765-4321",
    email: "joao.silva@exemplo.com"
  };
  
  // Dados fictícios do medicamento
  const medicationData = {
    nome: "Finasterida",
    dosagem: "1 mg",
    quantidade: "30 comprimidos",
    posologia: "Tomar 1 comprimido por via oral, uma vez ao dia, com ou sem alimentos."
  };
  
  // Obtém instruções com base no nome do medicamento
  const instructionsData = getInstructionsForProduct("Finasterida 1 mg");
  
  // Gera o PDF
  const pdfBuffer = await generatePrescriptionPDF(patientData, medicationData, instructionsData);
  
  // Salva o PDF para teste
  const outputPath = path.join(__dirname, 'receita_teste.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);
  
  console.log(`PDF de teste gerado com sucesso: ${outputPath}`);
  return outputPath;
}

// Exporta as funções para uso em outros módulos
module.exports = {
  generatePrescriptionPDF,
  getInstructionsForProduct,
  generateTestPDF
};

// Se este arquivo for executado diretamente, gera um PDF de teste
if (require.main === module) {
  generateTestPDF()
    .then(filePath => console.log(`PDF salvo em: ${filePath}`))
    .catch(error => console.error('Erro:', error));
}
