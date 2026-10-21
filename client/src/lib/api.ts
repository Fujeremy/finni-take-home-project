import type { CreatePatientData, Patient } from "@finni/shared";

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

// An API failure with a message to show and, for rejected input, the messages per field.
// status is the HTTP status, or undefined when the server couldn't be reached.
export class ApiError extends Error {
  readonly fieldErrors: Record<string, string[] | undefined>;
  readonly status: number | undefined;

  constructor(
    message: string,
    { fieldErrors = {}, status }: { fieldErrors?: Record<string, string[] | undefined>; status?: number } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

const UNREACHABLE_MESSAGE = "The server can't be reached. Check that it's running, then try again.";

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return false;
  }
  const { error } = body;
  return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string";
}

// Uses the API's JSON error when there is one. Other failures, such as the dev proxy
// answering because the API is down, get a generic message instead.
async function readApiError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (isApiErrorBody(body)) {
      return new ApiError(body.error.message, { fieldErrors: body.error.fieldErrors, status: response.status });
    }
  } catch {
    // The body was not JSON.
  }
  return new ApiError(UNREACHABLE_MESSAGE);
}

async function sendRequest(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw await readApiError(response);
  }
  return response;
}

export async function getPatients(): Promise<Patient[]> {
  const response = await sendRequest("/api/patients", { headers: { Accept: "application/json" } });
  return (await response.json()) as Patient[];
}

// The ID goes into the path as typed, encoded so characters like "/" can't change the route.
export async function getPatient(patientId: string): Promise<Patient> {
  const response = await sendRequest(`/api/patients/${encodeURIComponent(patientId)}`, {
    headers: { Accept: "application/json" },
  });
  return (await response.json()) as Patient;
}

export async function createPatient(patient: CreatePatientData): Promise<Patient> {
  const response = await sendRequest("/api/patients", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(patient),
  });
  return (await response.json()) as Patient;
}
