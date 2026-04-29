import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type ForgotPasswordBody = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ForgotPasswordBody;
    const email = body.email?.trim() ?? "";

    if (!email) {
      return NextResponse.json(
        { message: "E-mail e obrigatorio." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(buildBackendUrl("/auth/forgot-password"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message =
        getBackendErrorMessage(payload) ??
        "Nao foi possivel solicitar o reset de senha.";

      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao solicitar reset de senha." },
      { status: 500 },
    );
  }
}
