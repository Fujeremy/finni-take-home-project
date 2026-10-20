import type { CreatePatientData, Patient } from "@finni/shared";

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

// An API failure with a message to show and, for rejected input, the messages per field.
export class ApiError extends Error {
  readonly fieldErrors: Record<string, string[] | undefined>;

  constructor(message: string, fieldErrors: Record<string, string[] | undefined> = {}) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
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
      return new ApiError(body.error.message, body.error.fieldErrors);
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

export async function createPatient(patient: CreatePatientData): Promise<Patient> {
  const response = await sendRequest("/api/patients", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(patient),
  });
  return (await response.json()) as Patient;
}
