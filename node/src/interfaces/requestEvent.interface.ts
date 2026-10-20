// Event published by clean-architecture-api on each state change of a request (SemilleroSOLID/clean-architecture-api#20).
export type RequestState = "PENDING" | "ACTIVE" | "ACCEPT" | "REJECT" | "CANCELLED";

export interface IRequestStatusChangedEvent {
  event: "REQUEST_STATUS_CHANGED";
  requestId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  convocationId: number;
  convocationTitle: string;
  // null when the request was just created
  previousState: RequestState | null;
  newState: RequestState;
  // justification of a rejection
  comment: string | null;
  date: string;
}
