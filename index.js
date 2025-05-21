const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const mailgunTransport = require('nodemailer-mailgun-transport');
const fs = require("fs").promises; // Ensure fs.promises is used
const path = require("path");
require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

// Importar o módulo de geração de PDF
const { generatePrescriptionPDF, getInstructionsForProduct } = require('./generate_pdf');

const app = express();
const port = process.env.PORT || 5002;
const pdfDir = path.join(__dirname, "pdfs");

// Updated function to send an email with PDF attachment as buffer using Mailgun
async function sendEmailWithAttachment(eventData, pdfBuffer) {
    console.log("[EMAIL_SENDING] Starting email sending process with Mailgun (PDF as buffer)...");

    // Configuração do Mailgun usando variáveis de ambiente
    const mailgunAuth = {
        auth: {
            api_key: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN
        }
    };

    let transporter = nodemailer.createTransport(mailgunTransport(mailgunAuth));
    console.log("[EMAIL_SENDING] Nodemailer Mailgun transporter created.");

    const customerName = eventData.customer_details?.name || "Valued Customer";
    const customerEmail = eventData.customer_details?.email || "No email provided";
    const amountTotal = (eventData.amount_total / 100).toFixed(2);
    const currency = eventData.currency.toUpperCase();

    console.log(`[EMAIL_SENDING] Preparing email about purchase for ${customerName} (${customerEmail}) to be sent to recipients.`);
    try {
        let info = await transporter.sendMail({
            from: `'${process.env.EMAIL_FROM_NAME || "Perceb Notificações"}' <${process.env.EMAIL_FROM_ADDRESS || "noreply@mail.perceb.com.br"}>`,
            to: process.env.EMAIL_TO || "robertocunha@gmail.com, robertocunha@perceb.com.br",
            subject: "Nova Compra Realizada na Perceb! (Receita em PDF)",
            text: `Olá,\n\nUma nova compra foi realizada!\nCliente: ${customerName} (${customerEmail})\nValor: ${amountTotal} ${currency}\nID da Sessão: ${eventData.id}\n\nSegue em anexo a receita médica em PDF.\nPor favor, verifique o painel do Stripe para mais detalhes.`,
            html: `<p>Olá,</p><p>Uma nova compra foi realizada!</p><ul><li>Cliente: ${customerName} (${customerEmail})</li><li>Valor: ${amountTotal} ${currency}</li><li>ID da Sessão: ${eventData.id}</li></ul><p>Segue em anexo a receita médica em PDF.</p><p>Por favor, verifique o painel do Stripe para mais detalhes.</p>`,
            attachments: [
                {
                    filename: `receita_${eventData.id}.pdf`,
                    content: pdfBuffer, // Attach the buffer directly
                    contentType: "application/pdf",
                    encoding: "base64" // Explicitly set encoding
                }
            ]
        });

        console.log("[EMAIL_SENDING] Message sent successfully via Mailgun. Message ID: %s", info.id);
        return { success: true, messageId: info.id };
    } catch (error) {
        console.error("[EMAIL_SENDING] Error sending email via Mailgun:", error);
        return { success: false, error: error.message };
    }
}

app.post("/webhook", bodyParser.json({ type: "application/json" }), async (req, res) => {
    console.log("[WEBHOOK] Webhook received!");
    const event = req.body;
    let emailSendStatus = null;
    let pdfGeneratedPath = null;

    try {
        console.log("[WEBHOOK] Ensuring PDF directory exists at:", pdfDir);
        await fs.mkdir(pdfDir, { recursive: true });
        console.log("[WEBHOOK] PDF directory ensured.");
    } catch (error) {
        console.error("[WEBHOOK] Error creating PDF directory:", error);
        return res.status(500).json({ received: true, error: "Failed to create PDF directory" });
    }

    console.log("[WEBHOOK] Event Type:", event.type);
    if (event.data && event.data.object) {
        console.log("[WEBHOOK] Event Data Object ID:", event.data.object.id);
    }

    switch (event.type) {
        case "checkout.session.completed":
            const session = event.data.object;
            console.log("[WEBHOOK] Checkout Session was completed! ID:", session.id);
            if (session.payment_status === "paid") {
                console.log("[WEBHOOK] Payment was successful for session:", session.id);
                try {
                    // Obter informações do produto (em produção, extrair do evento do Stripe)
                    // Exemplo: const productName = session.line_items[0].description;
                    const productName = "Finasterida 1 mg"; // Produto de exemplo para teste
                    
                    // Dados do paciente extraídos do evento do Stripe
                    const patientData = {
                        nome: session.customer_details?.name || "Nome não informado",
                        cpf: "CPF não disponível", // Não disponível no evento padrão do Stripe
                        endereco: session.customer_details?.address ? 
                            `${session.customer_details.address.line1}${session.customer_details.address.line2 ? ', ' + session.customer_details.address.line2 : ''}, ${session.customer_details.address.city}, ${session.customer_details.address.state} - ${session.customer_details.address.postal_code}, ${session.customer_details.address.country}`
                            : "Endereço não fornecido",
                        telefone: session.customer_details?.phone || "Telefone não informado",
                        email: session.customer_details?.email || "Email não informado"
                    };
                    
                    // Dados do medicamento (em produção, extrair do produto no Stripe)
                    const medicationData = {
                        nome: "Finasterida",
                        dosagem: "1 mg",
                        quantidade: "30 comprimidos",
                        posologia: "Tomar 1 comprimido por via oral, uma vez ao dia, com ou sem alimentos."
                    };
                    
                    // Obter instruções específicas para o produto
                    const instructionsData = getInstructionsForProduct(productName);
                    
                    console.log("[WEBHOOK] Generating dynamic PDF with patient and medication data...");
                    const pdfBuffer = await generatePrescriptionPDF(patientData, medicationData, instructionsData);
                    
                    // Salvar o PDF gerado (opcional)
                    pdfGeneratedPath = path.join(pdfDir, `receita_${session.id}.pdf`);
                    await fs.writeFile(pdfGeneratedPath, pdfBuffer);
                    console.log("[WEBHOOK] PDF saved to:", pdfGeneratedPath);
                    
                    console.log("[WEBHOOK] Attempting to send email with PDF attachment...");
                    emailSendStatus = await sendEmailWithAttachment(session, pdfBuffer);
                    console.log("[WEBHOOK] Email with PDF attachment sending process completed. Status:", emailSendStatus);

                } catch (error) {
                    console.error("[WEBHOOK] Error during PDF generation or email sending for session:", session.id, error);
                    // Optionally, send a different response or log more details
                }
            } else {
                console.log("[WEBHOOK] Payment not successful for session:", session.id, "Not processing PDF/email.");
            }
            break;
        default:
            console.log(`[WEBHOOK] Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true, message: "Webhook processed.", pdfPath: pdfGeneratedPath, emailStatus: emailSendStatus });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Stripe webhook listener server running at http://0.0.0.0:${port}/webhook`);
});
