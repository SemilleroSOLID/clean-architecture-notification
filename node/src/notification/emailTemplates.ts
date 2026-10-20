import { IRequestStatusChangedEvent } from "../interfaces/requestEvent.interface";

export interface IEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface ITemplate {
  subject: string;
  title: string;
  color: string;
  paragraphs: string[];
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// One template per state the student can reach (received, approved, rejected with justification, withdrawn).
const templateFor = (event: IRequestStatusChangedEvent): ITemplate => {
  const convocation = `"${event.convocationTitle}"`;
  switch (event.newState) {
    case "ACTIVE":
      return {
        subject: `Recibimos tu solicitud a ${event.convocationTitle}`,
        title: "Solicitud recibida",
        color: "#1677ff",
        paragraphs: [
          `Recibimos tu solicitud a la convocatoria ${convocation}.`,
          "Cumples con todos los requisitos. Queda en revisión hasta que el administrador la apruebe o la rechace, y te avisaremos por este medio.",
        ],
      };
    case "PENDING":
      return {
        subject: `Recibimos tu solicitud a ${event.convocationTitle}`,
        title: "Solicitud recibida",
        color: "#faad14",
        paragraphs: [
          `Recibimos tu solicitud a la convocatoria ${convocation}.`,
          "No cumples con todos los requisitos. Aun así queda en revisión y el administrador decidirá; te avisaremos por este medio.",
        ],
      };
    case "ACCEPT":
      return {
        subject: `Tu solicitud a ${event.convocationTitle} fue aprobada`,
        title: "Solicitud aprobada",
        color: "#389e0d",
        paragraphs: [`¡Felicitaciones! Tu solicitud a la convocatoria ${convocation} fue aprobada.`],
      };
    case "REJECT":
      return {
        subject: `Tu solicitud a ${event.convocationTitle} fue rechazada`,
        title: "Solicitud rechazada",
        color: "#cf1322",
        paragraphs: [`Tu solicitud a la convocatoria ${convocation} fue rechazada.`, `Motivo: ${event.comment}`],
      };
    case "CANCELLED":
      return {
        subject: `Retiraste tu solicitud a ${event.convocationTitle}`,
        title: "Solicitud retirada",
        color: "#595959",
        paragraphs: [`Retiraste tu solicitud a la convocatoria ${convocation}. Ya no se considerará para la selección.`],
      };
  }
};

/** The email for the student about the new state of the request. */
export const buildRequestEmail = (event: IRequestStatusChangedEvent, appUrl: string): IEmail => {
  const template = templateFor(event);
  const link = `${appUrl}/my-requests`;
  const greeting = `Hola, ${event.studentName}:`;
  const footer = `Solicitud n.° ${event.requestId}. Puedes ver todas tus solicitudes en ${link}`;
  const text = [greeting, "", ...template.paragraphs, "", footer, "", "Sistema de Gestión de Servicios · Universidad de Caldas"].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">
  <div style="background:#003366;color:#ffffff;padding:16px 24px;font-size:18px">Sistema de Gestión de Servicios · Universidad de Caldas</div>
  <div style="padding:24px;color:#262626;font-size:15px;line-height:1.5">
    <p style="display:inline-block;margin:0 0 16px;padding:4px 12px;border-radius:4px;background:${template.color};color:#ffffff;font-weight:bold">${escape(template.title)}</p>
    <p>${escape(greeting)}</p>
    ${template.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("\n    ")}
    <p><a href="${escape(link)}" style="color:#003366;font-weight:bold">Ver mis solicitudes</a></p>
    <p style="color:#8c8c8c;font-size:13px">Solicitud n.° ${event.requestId}</p>
  </div>
</div>`;
  return { to: event.studentEmail, subject: template.subject, text, html };
};
