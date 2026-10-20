import type { Patient } from "@finni/shared";

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

const UNREACHABLE_MESSAGE = "The server can't be reached. Check that it's running, then try again.";

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return false;
  }
  const { error } = body;
  return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string";
}

// Uses the API's JSON error message when there is one. Other failures, such as the
// dev proxy answering because the API is down, get a generic message instead.
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isApiErrorBody(body)) {
      return body.error.message;
    }
  } catch {
    // The body was not JSON.
  }
  return UNREACHABLE_MESSAGE;
}

export async function getPatients(): Promise<Patient[]> {
  let response: Response;
  try {
    response = await fetch("/api/patients", { headers: { Accept: "application/json" } });
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return (await response.json()) as Patient[];
}
