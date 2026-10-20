import { IRequestStatusChangedEvent, RequestState } from "../interfaces/requestEvent.interface";

export const REQUEST_STATES: RequestState[] = ["PENDING", "ACTIVE", "ACCEPT", "REJECT", "CANCELLED"];

/** A message that is not a valid event: retrying it would fail the same way, so it is set aside. */
export class InvalidEventError extends Error {}

const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/** Reads the body of a RabbitMQ message as the event of the api, or explains why it is not one. */
export const parseRequestEvent = (content: string): IRequestStatusChangedEvent => {
  let data: any;
  try {
    data = JSON.parse(content);
  } catch {
    throw new InvalidEventError("el mensaje no es JSON");
  }
  if (data === null || typeof data !== "object") throw new InvalidEventError("el mensaje no es un objeto JSON");
  if (data.event !== "REQUEST_STATUS_CHANGED") throw new InvalidEventError(`evento desconocido: ${data.event}`);
  if (!Number.isInteger(data.requestId)) throw new InvalidEventError("falta requestId");
  if (!isText(data.studentEmail) || !data.studentEmail.includes("@")) throw new InvalidEventError("falta el correo del estudiante");
  if (!isText(data.studentName)) throw new InvalidEventError("falta el nombre del estudiante");
  if (!isText(data.convocationTitle)) throw new InvalidEventError("falta el título de la convocatoria");
  if (!REQUEST_STATES.includes(data.newState)) throw new InvalidEventError(`estado desconocido: ${data.newState}`);
  if (data.newState === "REJECT" && !isText(data.comment)) throw new InvalidEventError("un rechazo debe traer la justificación");
  return data as IRequestStatusChangedEvent;
};
