import { test } from "node:test";
import assert from "node:assert/strict";
import { ConsumeMessage } from "amqplib";
import { AmqpBroker } from "../classes";
import { EmailConsumer } from "../consumer/emailConsumer.service";
import { IEmail, buildRequestEmail } from "../notification/emailTemplates";
import { IMailer } from "../notification/mailer";
import { InvalidEventError, parseRequestEvent } from "../notification/requestEvent";
import { IRequestStatusChangedEvent } from "../interfaces/requestEvent.interface";

const event = (changes: Partial<IRequestStatusChangedEvent> = {}): IRequestStatusChangedEvent => ({
  event: "REQUEST_STATUS_CHANGED",
  requestId: 9,
  studentId: 4,
  studentName: "Santiago Ramírez López",
  studentEmail: "santiago.ramirez@ucaldas.test",
  convocationId: 3,
  convocationTitle: "Residencia Estudiantil 2027",
  previousState: "PENDING",
  newState: "REJECT",
  comment: "El promedio mínimo para la residencia es 3.5",
  date: "2026-10-19T23:00:06-05:00",
  ...changes,
});

const message = (content: string) => ({ content: Buffer.from(content) } as ConsumeMessage);

// A broker that records what is set aside instead of talking to RabbitMQ, and a mailer that can fail.
const setUp = (failures = 0) => {
  const sent: IEmail[] = [];
  const setAside: { key: string; reason: string }[] = [];
  let calls = 0;
  const mailer: IMailer = {
    send: async (email) => {
      calls++;
      if (calls <= failures) throw new Error("SMTP no disponible");
      sent.push(email);
    },
  };
  const amqp = {
    send: (_exchange: string, key: string, _msg: string, _noAck: boolean, options: any) => setAside.push({ key, reason: options.headers.reason }),
  } as unknown as AmqpBroker;
  const consumer = new EmailConsumer(mailer, { appUrl: "http://localhost:5173", maxAttempts: 3, retryDelayMs: 0 }, amqp);
  return { consumer, sent, setAside, calls: () => calls };
};

test("lee el evento del api", () => {
  assert.equal(parseRequestEvent(JSON.stringify(event())).requestId, 9);
});

test("rechaza un mensaje que no es JSON o no es el evento", () => {
  assert.throws(() => parseRequestEvent("hola"), InvalidEventError);
  assert.throws(() => parseRequestEvent(JSON.stringify({ event: "OTRO" })), InvalidEventError);
  assert.throws(() => parseRequestEvent(JSON.stringify(event({ studentEmail: "sin-arroba" }))), InvalidEventError);
  assert.throws(() => parseRequestEvent(JSON.stringify(event({ newState: "X" as any }))), InvalidEventError);
  assert.throws(() => parseRequestEvent(JSON.stringify(event({ comment: null }))), /justificación/);
});

test("cada estado tiene su asunto", () => {
  const subject = (changes: Partial<IRequestStatusChangedEvent>) => buildRequestEmail(event(changes), "").subject;
  assert.equal(subject({ previousState: null, newState: "ACTIVE" }), "Recibimos tu solicitud a Residencia Estudiantil 2027");
  assert.equal(subject({ previousState: null, newState: "PENDING" }), "Recibimos tu solicitud a Residencia Estudiantil 2027");
  assert.equal(subject({ newState: "ACCEPT" }), "Tu solicitud a Residencia Estudiantil 2027 fue aprobada");
  assert.equal(subject({ newState: "REJECT" }), "Tu solicitud a Residencia Estudiantil 2027 fue rechazada");
  assert.equal(subject({ newState: "CANCELLED" }), "Retiraste tu solicitud a Residencia Estudiantil 2027");
});

test("el correo de rechazo incluye la justificación y escapa el HTML", () => {
  const email = buildRequestEmail(event({ comment: "Promedio < 3.5" }), "http://localhost:5173");
  assert.equal(email.to, "santiago.ramirez@ucaldas.test");
  assert.match(email.text, /Motivo: Promedio < 3.5/);
  assert.match(email.html, /Motivo: Promedio &lt; 3.5/);
  assert.match(email.html, /http:\/\/localhost:5173\/my-requests/);
});

test("un evento válido envía un correo", async () => {
  const { consumer, sent, setAside } = setUp();
  await consumer.consumeMessage(message(JSON.stringify(event())));
  assert.equal(sent.length, 1);
  assert.equal(setAside.length, 0);
});

test("un mensaje mal formado no se envía, se aparta y el consumidor sigue", async () => {
  const { consumer, sent, setAside } = setUp();
  await consumer.consumeMessage(message("{no es json"));
  await consumer.consumeMessage(message(JSON.stringify(event())));
  assert.equal(sent.length, 1);
  assert.deepEqual(setAside.map(({ key }) => key), ["email.failed"]);
  assert.match(setAside[0].reason, /mensaje inválido/);
});

test("si el SMTP falla reintenta y, agotados los intentos, aparta el mensaje", async () => {
  const recovers = setUp(2);
  await recovers.consumer.consumeMessage(message(JSON.stringify(event())));
  assert.equal(recovers.calls(), 3);
  assert.equal(recovers.sent.length, 1);

  const fails = setUp(5);
  await fails.consumer.consumeMessage(message(JSON.stringify(event())));
  assert.equal(fails.calls(), 3);
  assert.equal(fails.sent.length, 0);
  assert.match(fails.setAside[0].reason, /no se pudo enviar el correo: SMTP no disponible/);
});
